import frappe
from frappe.model.document import Document
from frappe.utils import add_days, date_diff, getdate


def _get_total_stay_period():
	fieldname = "total_stay_period"
	if frappe.get_meta("omra_setting").has_field("stay_days_in_kingdom"):
		fieldname = "stay_days_in_kingdom"
	return frappe.db.get_single_value("omra_setting", fieldname)


@frappe.whitelist()
def get_total_stay_period():
	return _get_total_stay_period()


class Umrah_Customer(Document):
	def before_save(self):
		self._apply_entry_date_from_kingdom_days()
		self._apply_stay_days_from_kingdom_days()
		self._apply_stay_calculations()
		self._apply_days_since_entry()

	def _apply_entry_date_from_kingdom_days(self):
		if self.stay_days_in_kingdom in (None, ""):
			return
		if not self.is_new() and not self.has_value_changed("stay_days_in_kingdom"):
			return
		days_in_kingdom = int(self.stay_days_in_kingdom)
		self.entry_date = add_days(getdate(), -days_in_kingdom)

	def _apply_stay_days_from_kingdom_days(self):
		if self.stay_days_in_kingdom in (None, ""):
			return
		total_stay_period = _get_total_stay_period()
		if total_stay_period in (None, ""):
			return
		self.number_of_days_of_stay = int(total_stay_period) - int(self.stay_days_in_kingdom)

	def _apply_stay_calculations(self):
		if not self.entry_date or self.number_of_days_of_stay is None:
			return
		entry_date = getdate(self.entry_date)
		days_stay = int(self.number_of_days_of_stay)
		# تاريخ الخروج المتوقع: تاريخ الدخول + عدد أيام الإقامة
		self.exit_date = add_days(entry_date, days_stay)
		exit_date = getdate(self.exit_date)
		# عدد الأيام بين تاريخ الدخول وتاريخ الخروج
		self.remaining_days_of_stay = max(date_diff(exit_date, entry_date), 0)

	def _apply_days_since_entry(self):
		if self.number_of_days_of_stay is None:
			return
		if self.is_new() or self.has_value_changed("number_of_days_of_stay") or self.days_since_entry in (None, ""):
			self.days_since_entry = int(self.number_of_days_of_stay)
			self.days_since_entry_updated_on = getdate()
