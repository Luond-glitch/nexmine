from tests.conftest import register_expert, register_miner


def test_password_rules(make_client):
    c = make_client()
    assert register_miner(c, "m_ok", "ab@1").status_code == 201          # 4 characters + special
    assert register_miner(c, "m_short", "a@1").status_code == 422        # too short
    assert register_miner(c, "m_nospecial", "abcd1").status_code == 422  # no special character
    assert register_expert(c, "x@test.com", "L1", "abc@1").status_code == 422   # experts need 6


def test_login_logout_and_wrong_password(make_client):
    c = make_client(); register_miner(c)
    c.post("/api/auth/logout"); assert c.get("/api/auth/me").status_code == 401
    assert c.post("/api/auth/login", json={"role": "miner", "identifier": "miner1", "password": "nope"}).status_code == 401
    assert c.post("/api/auth/login", json={"role": "miner", "identifier": "MINER1", "password": "Gold@1"}).status_code == 200


def test_google_signin_is_gone(make_client):
    assert make_client().post("/api/auth/google", json={}).status_code in (404, 405)


def test_reset_request_by_email_or_phone_never_reveals_accounts(make_client):
    c = make_client(); register_miner(c)
    a = c.post("/api/auth/forgot-password", json={"phone": "0722000000"}); b = c.post("/api/auth/forgot-password", json={"phone": "0799999999"})
    d = c.post("/api/auth/forgot-password", json={"email": "nobody@test.com"})
    assert a.status_code == b.status_code == d.status_code == 200 and a.json() == b.json() == d.json()
    assert c.post("/api/auth/forgot-password", json={}).status_code == 422


def test_pending_expert_is_locked_until_admin_approves(make_client, admin):
    c = make_client(); register_expert(c)
    assert c.get("/api/consult/requests/open").status_code == 403
    uid = c.get("/api/auth/me").json()["id"]
    assert any(e["id"] == uid for e in admin.get("/api/admin/experts?status=pending").json()["items"])
    admin.post(f"/api/admin/experts/{uid}/status", json={"status": "verified"})
    assert c.get("/api/consult/requests/open").status_code == 200


def test_only_admin_can_use_admin_routes(make_client):
    c = make_client(); register_miner(c)
    assert c.get("/api/admin/users").status_code == 403


def test_full_consultation_flow(make_client, approved_expert):
    ex, ex_id = approved_expert
    m = make_client(); register_miner(m)
    r = m.post("/api/consult/requests", json={"service_type": "Environmental Impact Assessment", "location": "Abimbo", "description": "I want to start a small gold mine."})
    assert r.status_code == 201; rid = r.json()["id"]
    assert ex.get("/api/consult/requests/open").json()[0]["miner"] is None          # miner stays anonymous
    assert ex.post(f"/api/consult/requests/{rid}/accept").status_code == 200
    assert ex.post(f"/api/consult/requests/{rid}/accept").status_code == 409        # first expert wins
    assert m.post(f"/api/consult/requests/{rid}/messages", json={"body": "Hello"}).status_code == 201
    assert ex.get(f"/api/consult/requests/{rid}/messages").json()[0]["body"] == "Hello"
    ap = ex.post(f"/api/consult/requests/{rid}/appointments", json={"starts_at": "2099-01-01T10:00"}).json()
    assert m.post(f"/api/consult/appointments/{ap['id']}/respond", json={"action": "accept"}).json()["status"] == "confirmed"
    assert ex.post(f"/api/consult/appointments/{ap['id']}/respond", json={"action": "accept"}).status_code == 409   # cannot confirm own proposal
    f = ex.post(f"/api/consult/requests/{rid}/files", files={"file": ("a.pdf", b"%PDF-1.4 test", "application/pdf")})
    assert f.status_code == 201
    assert ex.post(f"/api/consult/requests/{rid}/files", files={"file": ("x.pdf", b"not a pdf", "application/pdf")}).status_code == 415
    assert m.post(f"/api/consult/requests/{rid}/rating", json={"stars": 5}).status_code == 409          # not complete yet
    assert m.post(f"/api/consult/requests/{rid}/close").status_code == 200
    assert m.post(f"/api/consult/requests/{rid}/rating", json={"stars": 5}).status_code == 201
    assert m.post(f"/api/consult/requests/{rid}/rating", json={"stars": 4}).status_code == 409
    assert m.get("/api/experts").json()[0]["rating"] == 5.0
    other = make_client(); register_miner(other, "intruder")
    assert other.get(f"/api/consult/requests/{rid}/messages").status_code == 403


def test_chat_answers_without_any_ai_keys(make_client):
    c = make_client(); register_miner(c)
    hi = c.post("/api/chat", json={"message": "habari yako"}).json(); assert "Mzuri" in hi["answer"]
    gold = c.post("/api/chat", json={"message": "what is gold"}).json(); assert gold["answer"].startswith("Gold is")
    how = c.post("/api/chat", json={"message": "how can I mine gold?"}).json(); assert "permit" in how["answer"].lower()
    assert c.post("/api/chat", json={"message": "x" * 3000}).status_code == 422


def test_story_moderation_and_privacy(make_client, admin):
    c = make_client(); register_miner(c)
    body = {"title": "Our pit", "body": "We filled and replanted the old pit near our village last year.", "category": "Success story"}
    sid = c.post("/api/stories", json=body).json()["id"]
    assert c.get("/api/stories").json() == []                                      # pending stories are not public
    assert c.post("/api/stories", json={**body, "body": body["body"] + " call 0712345678"}).status_code == 422
    admin.post(f"/api/admin/stories/{sid}/decide", json={"status": "approved"})
    assert len(c.get("/api/stories").json()) == 1


def test_checklist_and_rehab_log(make_client):
    c = make_client(); register_miner(c)
    assert c.put("/api/tools/checklist", json={"answers": {"c1": "yes", "c2": "no"}}).json()["score"]["yes"] == 1
    assert c.put("/api/tools/checklist", json={"answers": {"zzz": "yes"}}).status_code == 422
    r = c.post("/api/tools/rehab", json={"activity": "Refill old pit", "activity_date": "2026-11-01"}).json()
    assert c.patch(f"/api/tools/rehab/{r['id']}", json={"status": "done"}).json()["status"] == "done"


def test_admin_can_deactivate_users_but_not_themselves(make_client, admin):
    m = make_client(); register_miner(m); uid = m.get("/api/auth/me").json()["id"]
    assert admin.post(f"/api/admin/users/{uid}/active", json={"active": False}).status_code == 200
    assert m.get("/api/auth/me").status_code == 401
    me = admin.get("/api/auth/me").json()["id"]
    assert admin.post(f"/api/admin/users/{me}/active", json={"active": False}).status_code == 409
    assert "users" in admin.get("/api/admin/analytics").json()
