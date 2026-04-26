function umrah_parse_int(value) {
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function umrah_set_days_since_entry_from_kingdom_days(frm) {
	const raw = frm.doc.stay_days_in_kingdom;
	if (raw === undefined || raw === null || raw === "") {
		return;
	}

	const days = umrah_parse_int(raw);
	if (days === null) {
		return;
	}

	frm.set_value("days_since_entry", days);
	frm.set_value("days_since_entry_updated_on", frappe.datetime.get_today());
}

function umrah_recalc_stay(frm) {
	const entry = frm.doc.entry_date;
	const raw = frm.doc.number_of_days_of_stay;
	if (!entry || raw === undefined || raw === null || raw === "") return;

	const days = umrah_parse_int(raw);
	if (days === null) return;

	const exit_str = frappe.datetime.add_days(entry, days);
	const span = frappe.datetime.get_diff(exit_str, entry);
	frm.set_value("exit_date", exit_str);
	const days_since_entry = umrah_parse_int(frm.doc.days_since_entry);
	if (days_since_entry === null) {
		frm.set_value("remaining_days_of_stay", Math.max(span, 0));
		return;
	}
	frappe.db.get_single_value("omra_setting", "total_stay_period").then((total_stay_period) => {
		const total_days = umrah_parse_int(total_stay_period);
		if (total_days === null) return;
		frm.set_value("remaining_days_of_stay", Math.max(total_days - days_since_entry, 0));
	});
}

function umrah_apply_kingdom_days(frm) {
	const raw = frm.doc.stay_days_in_kingdom;
	if (raw === undefined || raw === null || raw === "") return;

	const days = umrah_parse_int(raw);
	if (days === null) return;

	const entry_date = frappe.datetime.add_days(frappe.datetime.get_today(), -days);

	frm.set_value("entry_date", entry_date).then(() => {
		return frappe.db.get_single_value("omra_setting", "total_stay_period");
	}).then((total_stay_period) => {
		const total_days = umrah_parse_int(total_stay_period);
		if (total_days === null) {
			umrah_recalc_stay(frm);
			return;
		}
		return frm.set_value("number_of_days_of_stay", total_days - days).then(() => {
			umrah_set_days_since_entry_from_kingdom_days(frm);
			umrah_recalc_stay(frm);
		});
	});
}

frappe.ui.form.on("Umrah_Customer", {
	refresh(frm) {
		umrah_recalc_stay(frm);
		if ((frm.doc.days_since_entry === undefined || frm.doc.days_since_entry === null || frm.doc.days_since_entry === "") && frm.doc.stay_days_in_kingdom) {
			umrah_set_days_since_entry_from_kingdom_days(frm);
		}
	},
	entry_date(frm) {
		umrah_recalc_stay(frm);
	},
	number_of_days_of_stay(frm) {
		umrah_recalc_stay(frm);
	},
	stay_days_in_kingdom(frm) {
		umrah_apply_kingdom_days(frm);
	},
});
