import frappe
from frappe.utils import add_days, date_diff, getdate


def update_remaining_days_for_all_umrah_customers():
	rows = frappe.get_all(
		"Umrah_Customer",
		filters={"entry_date": ["!=", None], "number_of_days_of_stay": ["!=", None]},
		fields=[
			"name",
			"entry_date",
			"number_of_days_of_stay",
			"days_since_entry",
			"days_since_entry_updated_on",
		],
	)
	now = getdate()
	for row in rows:
		entry_date = getdate(row.entry_date)
		days_stay = int(row.number_of_days_of_stay)
		exit_date = add_days(entry_date, days_stay)
		span_days = max(date_diff(getdate(exit_date), entry_date), 0)
		current_days_since_entry = int(row.days_since_entry or row.number_of_days_of_stay)
		last_updated = getdate(row.days_since_entry_updated_on) if row.days_since_entry_updated_on else now
		days_to_add = max(date_diff(now, last_updated), 0)
		frappe.db.set_value(
			"Umrah_Customer",
			row.name,
			{
				"exit_date": exit_date,
				"remaining_days_of_stay": span_days,
				"days_since_entry": current_days_since_entry + days_to_add,
				"days_since_entry_updated_on": now,
			},
			update_modified=False,
		)
	frappe.db.commit()


def alert_remaining_umrah_stay():
	settings = frappe.db.get_value(
		"omra_setting", None, ["maximum_period", "customer_link"], as_dict=True
	)
	if not settings or not settings.get("maximum_period"):
		return
	maximum_period = int(settings.maximum_period)
	customer_link = (settings.customer_link or "").rstrip("/")

	rows = frappe.get_all(
		"Umrah_Customer",
		filters={"entry_date": ["!=", None], "number_of_days_of_stay": ["!=", None]},
		fields=["name", "passport_number", "entry_date", "number_of_days_of_stay"],
	)
	now = getdate()
	for row in rows:
		entry_date = getdate(row.entry_date)
		days_stay = int(row.number_of_days_of_stay)
		exit_date = getdate(add_days(entry_date, days_stay))
		# أيام متبقية حتى تاريخ الخروج (للتنبيه)، وليس فرق الدخول/الخروج المحفوظ في الحقل
		days_left = max(date_diff(exit_date, now), 0)
		if not (0 < days_left <= maximum_period):
			continue
		passport = row.passport_number or ""
		doc_url = f"{customer_link}/app/Form/Umrah_Customer/{row.name}" if customer_link else ""
		if doc_url:
			message = f"تنبيه: عميل العمرة <a href='{doc_url}'>{row.name}</a> (رقم الجواز: {passport}) لديه {days_left} يومًا فقط متبقية من إقامته."
		else:
			message = f"تنبيه: عميل العمرة {row.name} (رقم الجواز: {passport}) لديه {days_left} يومًا فقط متبقية من إقامته."
		frappe.publish_realtime(event="msgprint", message=message)
