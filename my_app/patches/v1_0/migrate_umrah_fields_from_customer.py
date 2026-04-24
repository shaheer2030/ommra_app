import frappe


def execute():
	if not frappe.db.table_exists("Umrah_Customer"):
		return
	if not frappe.db.has_column("Customer", "custom_entry_date"):
		return

	customers = frappe.db.sql(
		"""
		SELECT name, custom_passport_number, custom_visa_date, custom_visa_number,
			custom_entry_date, custom_number_of_days_of_stay, custom_remaining_days_of_stay,
			custom_exit_date, custom_status_stay
		FROM `tabCustomer`
		WHERE IFNULL(custom_entry_date, '') != ''
			OR IFNULL(custom_passport_number, '') != ''
		""",
		as_dict=True,
	)

	for c in customers:
		if frappe.db.exists("Umrah_Customer", {"customer": c.name}):
			continue
		try:
			days = c.custom_number_of_days_of_stay
			if days is None or str(days).strip() == "":
				continue
			days_int = int(float(days))
		except (TypeError, ValueError):
			continue

		entry_date = c.custom_entry_date
		if not entry_date:
			continue
		visa_date = c.custom_visa_date or entry_date

		doc = frappe.get_doc(
			{
				"doctype": "Umrah_Customer",
				"customer": c.name,
				"passport_number": c.custom_passport_number,
				"visa_date": visa_date,
				"visa_number": c.custom_visa_number,
				"entry_date": entry_date,
				"number_of_days_of_stay": days_int,
				"status_stay": c.custom_status_stay or 1,
			}
		)
		doc.insert(ignore_permissions=True)

	frappe.db.commit()
