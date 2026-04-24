import frappe


def execute():
	"""Umrah_Customer DocType already uses slug /app/umrah_customer; remove Workspace that duplicated an Arabic slug."""
	for name in ("Umrah_Customers",):
		if frappe.db.exists("Workspace", name):
			frappe.delete_doc("Workspace", name, force=1, ignore_permissions=True)
	frappe.db.commit()
