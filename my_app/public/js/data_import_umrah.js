(function () {
	const DEFAULT_UMRAH_IMPORT_FIELDS = new Set([
		"pilgrim_name",
		"passport_number",
		"stay_days_in_kingdom",
	]);

	function patch_umrah_data_exporter() {
		if (!frappe.data_import?.DataExporter?.prototype) return;
		if (frappe.data_import.DataExporter.prototype._my_app_umrah_defaults_patched) return;

		const prototype = frappe.data_import.DataExporter.prototype;
		const orig_get_multicheck_options = prototype.get_multicheck_options;
		const orig_select_mandatory = prototype.select_mandatory;

		prototype._my_app_umrah_defaults_patched = true;

		prototype.get_multicheck_options = function (doctype, child_fieldname = null) {
			const options = orig_get_multicheck_options.call(this, doctype, child_fieldname);
			if (this.doctype !== "Umrah_Customer" || doctype !== "Umrah_Customer" || child_fieldname) {
				return options;
			}

			return options.map((option) => ({
				...option,
				checked: option.checked || DEFAULT_UMRAH_IMPORT_FIELDS.has(option.value),
			}));
		};

		prototype.select_mandatory = function () {
			orig_select_mandatory.call(this);
			if (this.doctype !== "Umrah_Customer") return;

			const field = this.dialog.get_field("Umrah_Customer");
			const checkboxes = field.options
				.filter((option) => DEFAULT_UMRAH_IMPORT_FIELDS.has(option.value))
				.map((option) => option.$checkbox.find("input").get(0));
			$(checkboxes).prop("checked", true).trigger("change");
		};
	}

	frappe.ui.form.off("Data Import", "download_template");
	frappe.ui.form.on("Data Import", {
		download_template(frm) {
			frappe.require("data_import_tools.bundle.js", () => {
				patch_umrah_data_exporter();
				frm.data_exporter = new frappe.data_import.DataExporter(
					frm.doc.reference_doctype,
					frm.doc.import_type
				);
			});
		},
	});
})();
