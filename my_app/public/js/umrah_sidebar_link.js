// Sidebar href uses slug(workspace title); DocType already owns /app/umrah_customer — point menu there.
(function () {
	const HUB_TITLE = "Umrah_Customers_Hub";
	const hub_slug = frappe.router.slug(HUB_TITLE);
	const UMRAH_IMPORT_FIELDS = [
		"pilgrim_name",
		"customer",
		"passport_number",
		"visa_number",
		"visa_date",
		"number_of_days_of_stay",
		"entry_date",
	];

	function patch_umrah_sidebar_link() {
		if (!frappe.views?.Workspace?.prototype) return;
		if (frappe.views.Workspace.prototype._my_app_umrah_sidebar_patched) return;
		frappe.views.Workspace.prototype._my_app_umrah_sidebar_patched = true;
		const orig = frappe.views.Workspace.prototype.make_sidebar;
		frappe.views.Workspace.prototype.make_sidebar = function () {
			orig.apply(this, arguments);
			this.sidebar
				.find(`a.item-anchor[href="/app/${hub_slug}"]`)
				.attr("href", "/app/umrah_customer");
		};
	}

	function patch_umrah_data_import_fields() {
		if (!frappe.data_import?.DataExporter?.prototype) return false;
		if (frappe.data_import.DataExporter.prototype._my_app_umrah_export_patched) return true;

		frappe.data_import.DataExporter.prototype._my_app_umrah_export_patched = true;
		const orig = frappe.data_import.DataExporter.prototype.get_multicheck_options;

		frappe.data_import.DataExporter.prototype.get_multicheck_options = function (
			doctype,
			child_fieldname = null
		) {
			if (this.doctype !== "Umrah_Customer" || doctype !== "Umrah_Customer" || child_fieldname) {
				return orig.call(this, doctype, child_fieldname);
			}

			const meta = frappe.get_meta("Umrah_Customer");
			return UMRAH_IMPORT_FIELDS.map((fieldname) => {
				const df = frappe.meta.get_field("Umrah_Customer", fieldname, null) || {};
				return {
					label: __(df.label || fieldname),
					value: fieldname,
					danger: !!df.reqd,
					checked: false,
					description: `${fieldname} ${df.reqd ? __("(Mandatory)") : ""}`,
				};
			}).filter((option) => meta.get_field(option.value));
		};
		return true;
	}

	function wait_and_patch_umrah_data_import_fields() {
		if (patch_umrah_data_import_fields()) return;
		const timer = setInterval(() => {
			if (patch_umrah_data_import_fields()) clearInterval(timer);
		}, 300);
		setTimeout(() => clearInterval(timer), 10000);
	}

	frappe.ready(patch_umrah_sidebar_link);
	frappe.ready(wait_and_patch_umrah_data_import_fields);
})();
