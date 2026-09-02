"""End-to-end smoke test against the real Supabase project.

Run after any schema or API change:

    cd backend
    .\\.venv\\Scripts\\python.exe smoke_test.py

It creates its own throwaway rows (all named "בדיקה — ..."), asserts the
behaviour the UI depends on, then deletes everything it made. Existing data is
read but never modified. Exits non-zero if anything fails.
"""

from fastapi.testclient import TestClient

from app.auth import AuthUser, require_user
from app.main import app

# This test exercises the data layer, not sign-in. Bypass the auth dependency
# so the requests below don't all 401 — the real gate is covered separately.
app.dependency_overrides[require_user] = lambda: AuthUser(id="smoke", email="smoke@test")

client = TestClient(app)
passed, failed = 0, 0
created = {}


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS  {label}")
    else:
        failed += 1
        print(f"  FAIL  {label}  {detail}")


# 1. health -------------------------------------------------------------
r = client.get("/api/health")
check("health returns ok", r.status_code == 200 and r.json()["status"] == "ok", r.text)

# 2. lookup lists ---------------------------------------------------------
r = client.post("/api/item-types", json={"name": "בדיקה — סוג"})
check("POST /api/item-types", r.status_code == 201, r.text)
created["type"] = r.json()["id"]

r = client.post("/api/item-models", json={"type_id": created["type"], "name": "בדיקה — דגם"})
check("POST /api/item-models", r.status_code == 201, r.text)
created["model"] = r.json()["id"]

r = client.get(f"/api/item-models?type_id={created['type']}")
check("GET /api/item-models filters by type_id", any(m["id"] == created["model"] for m in r.json()), r.text)

r = client.post("/api/item-statuses", json={"name": "בדיקה — סטטוס"})
check("POST /api/item-statuses", r.status_code == 201, r.text)
created["status"] = r.json()["id"]

r = client.post(
    "/api/locations",
    json={"name": "בדיקה — מיקום", "kind": "יחידה", "brigade": "חטיבה 1", "battalion": "גדוד 1"},
)
check("POST /api/locations", r.status_code == 201, r.text)
created["location"] = r.json()["id"]

# 3. project + item ---------------------------------------------------------
r = client.post("/api/projects", json={"name": "בדיקה — פרויקט", "status": "active"})
check("POST /api/projects", r.status_code == 201, r.text)
created["project"] = r.json()["id"]

r = client.post(
    "/api/items",
    json={
        "project_id": created["project"],
        "type_id": created["type"],
        "model_id": created["model"],
        "serial_id": "SMOKE-1",
        "status_id": created["status"],
        "location_id": created["location"],
    },
)
check("POST /api/items", r.status_code == 201, r.text)
item = r.json()
created["item"] = item["id"]
check("item embeds type", (item.get("type") or {}).get("name") == "בדיקה — סוג", str(item.get("type")))
check("item embeds model", (item.get("model") or {}).get("name") == "בדיקה — דגם", str(item.get("model")))
check("item embeds status", (item.get("status") or {}).get("name") == "בדיקה — סטטוס", str(item.get("status")))
check("item embeds location", (item.get("location") or {}).get("name") == "בדיקה — מיקום", str(item.get("location")))

r = client.get(f"/api/items?project_id={created['project']}")
check("GET /api/items filters by project_id", any(i["id"] == created["item"] for i in r.json()), r.text)

# 4. loan the item ------------------------------------------------------
r = client.post(
    "/api/loans",
    json={
        "project_id": created["project"],
        "item_id": created["item"],
        "location_id": created["location"],
        "quantity": 7,
        "notes": "smoke test",
    },
)
check("POST /api/loans", r.status_code == 201, r.text)
loan = r.json()
created["loan"] = loan["id"]
check("loan embeds item.serial_id", (loan.get("item") or {}).get("serial_id") == "SMOKE-1", str(loan.get("item")))
check("loan embeds location", (loan.get("location") or {}).get("name") == "בדיקה — מיקום", str(loan.get("location")))

# 5. feedback -------------------------------------------------------------
r = client.post(
    "/api/feedback",
    json={
        "project_id": created["project"],
        "location_id": created["location"],
        "loan_id": created["loan"],
        "rating": 4,
        "content": "משוב בדיקה",
    },
)
check("POST /api/feedback", r.status_code == 201, r.text)
fb = r.json()
created["feedback"] = fb["id"]
check("feedback embeds location", (fb.get("location") or {}).get("name") == "בדיקה — מיקום", str(fb.get("location")))
check(
    "feedback embeds loan.item.serial_id",
    ((fb.get("loan") or {}).get("item") or {}).get("serial_id") == "SMOKE-1",
    str(fb.get("loan")),
)
check("feedback_at auto-stamped", bool(fb.get("feedback_at")), str(fb.get("feedback_at")))

# 6. the main read path -----------------------------------------------------
r = client.get(f"/api/projects/{created['project']}/detail")
check("GET /api/projects/{id}/detail", r.status_code == 200, r.text)
detail = r.json()
check("detail.project correct", detail["project"]["id"] == created["project"])
check("detail.items has our item", any(i["id"] == created["item"] for i in detail["items"]))
check("detail.loans has our loan", any(l["id"] == created["loan"] for l in detail["loans"]))
check("detail.feedback has our feedback", any(f["id"] == created["feedback"] for f in detail["feedback"]))

# 7. counts reflect the new rows -------------------------------------------
r = client.get("/api/projects")
mine = next(p for p in r.json() if p["id"] == created["project"])
check("loan_count = 1", mine["loan_count"] == 1, str(mine["loan_count"]))
check("feedback_count = 1", mine["feedback_count"] == 1, str(mine["feedback_count"]))

# 8. FK protection ----------------------------------------------------------
r = client.delete(f"/api/locations/{created['location']}")
check("deleting an in-use location returns 409", r.status_code == 409, f"got {r.status_code}: {r.text[:120]}")

r = client.delete(f"/api/item-types/{created['type']}")
check("deleting an in-use type returns 409", r.status_code == 409, f"got {r.status_code}: {r.text[:120]}")

# 9. mark returned ----------------------------------------------------------
r = client.post(f"/api/loans/{created['loan']}/return")
check("POST /api/loans/{id}/return", r.status_code == 200, r.text)
returned = r.json()
check("status becomes returned", returned["status"] == "returned", returned["status"])
check("returned_at stamped", bool(returned["returned_at"]), str(returned["returned_at"]))

# 10. 404 handling ----------------------------------------------------------
r = client.get("/api/projects/00000000-0000-0000-0000-000000000000")
check("unknown project returns 404", r.status_code == 404, f"got {r.status_code}")

# 11. cleanup -----------------------------------------------------------
# Deleting the project cascades to its items, and to the loan/feedback
# (both by project_id, and the loan again transitively via item_id).
r = client.delete(f"/api/projects/{created['project']}")
check("DELETE project", r.status_code == 204, f"got {r.status_code}")
r = client.get(f"/api/items/{created['item']}")
check("item cascade-deleted", r.status_code == 404, f"got {r.status_code}")
r = client.get(f"/api/loans/{created['loan']}")
check("loan cascade-deleted", r.status_code == 404, f"got {r.status_code}")
r = client.get(f"/api/feedback/{created['feedback']}")
check("feedback cascade-deleted", r.status_code == 404, f"got {r.status_code}")

r = client.delete(f"/api/locations/{created['location']}")
check("DELETE location once free", r.status_code == 204, f"got {r.status_code}")
r = client.delete(f"/api/item-models/{created['model']}")
check("DELETE model once free", r.status_code == 204, f"got {r.status_code}")
r = client.delete(f"/api/item-types/{created['type']}")
check("DELETE type once free", r.status_code == 204, f"got {r.status_code}")
r = client.delete(f"/api/item-statuses/{created['status']}")
check("DELETE status once free", r.status_code == 204, f"got {r.status_code}")

print(f"\n  {passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
