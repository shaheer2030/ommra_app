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
		"stay_days_in_kingdom",
		"number_of_days_of_stay",
		"entry_date",
	];
	const DEFAULT_UMRAH_IMPORT_FIELDS = new Set([
		"pilgrim_name",
		"passport_number",
		"stay_days_in_kingdom",
	]);

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

	function patch_umrah_import_shortcut_button() {
		if (!frappe.views?.Workspace?.prototype) return;
		if (frappe.views.Workspace.prototype._my_app_umrah_import_button_patched) return;
		frappe.views.Workspace.prototype._my_app_umrah_import_button_patched = true;
		const orig = frappe.views.Workspace.prototype.show;
		frappe.views.Workspace.prototype.show = function () {
			orig.apply(this, arguments);
			const page = this.get_page_to_show?.();
			const route = frappe.get_route?.() || [];
			const route_slug = route[1];
			const page_slug = page?.name ? frappe.router.slug(page.name) : null;
			const normalized_route_slug =
				typeof route_slug === "string" ? route_slug.replace(/_/g, "-") : route_slug;
			const normalized_page_slug =
				typeof page_slug === "string" ? page_slug.replace(/_/g, "-") : page_slug;
			const is_umrah_workspace =
				normalized_route_slug === hub_slug || normalized_page_slug === hub_slug;
			if (!is_umrah_workspace || this._my_app_umrah_import_btn_added) return;
			this._my_app_umrah_import_btn_added = true;
			this.page.add_inner_button(__("استيراد عملاء العمرة"), () => {
				frappe.new_doc("Data Import", { reference_doctype: "Umrah_Customer" });
			});
		};
	}

	function patch_umrah_data_import_fields() {
		if (!frappe.data_import?.DataExporter?.prototype) return false;
		if (frappe.data_import.DataExporter.prototype._my_app_umrah_export_patched) return true;

		frappe.data_import.DataExporter.prototype._my_app_umrah_export_patched = true;
		const orig = frappe.data_import.DataExporter.prototype.get_multicheck_options;
		const orig_select_mandatory = frappe.data_import.DataExporter.prototype.select_mandatory;

		frappe.data_import.DataExporter.prototype.get_multicheck_options = function (
			doctype,
			child_fieldname = null
		) {
			if (this.doctype !== "Umrah_Customer" || doctype !== "Umrah_Customer" || child_fieldname) {
				return orig.call(this, doctype, child_fieldname);
			}

			return orig.call(this, doctype, child_fieldname).map((option) => ({
				...option,
				checked: option.checked || DEFAULT_UMRAH_IMPORT_FIELDS.has(option.value),
			}));
		};
		frappe.data_import.DataExporter.prototype.select_mandatory = function () {
			orig_select_mandatory.call(this);
			if (this.doctype !== "Umrah_Customer") return;

			const field = this.dialog.get_field("Umrah_Customer");
			const checkboxes = field.options
				.filter((option) => DEFAULT_UMRAH_IMPORT_FIELDS.has(option.value))
				.map((option) => option.$checkbox.find("input").get(0));
			$(checkboxes).prop("checked", true).trigger("change");
		};
		return true;
	}

	function wait_and_patch_umrah_data_import_fields() {
		if (patch_umrah_data_import_fields()) return;
		const timer = setInterval(() => {
			if (patch_umrah_data_import_fields()) clearInterval(timer);
		}, 250);
	}

	function patch_umrah_data_import_bundle_loader() {
		if (!frappe.require || frappe.require._my_app_umrah_import_loader_patched) return;

		const orig_require = frappe.require;
		frappe.require = function (items, callback) {
			const files = Array.isArray(items) ? items : [items];
			const loads_data_import_tools = files.some((item) =>
				String(item).includes("data_import_tools.bundle.js")
			);

			if (!loads_data_import_tools || typeof callback !== "function") {
				return orig_require.apply(this, arguments);
			}

			return orig_require.call(this, items, function () {
				patch_umrah_data_import_fields();
				return callback.apply(this, arguments);
			});
		};
		frappe.require._my_app_umrah_import_loader_patched = true;
	}

	function patch_company_logo_cropper() {
		const control = frappe.ui?.form?.ControlAttach?.prototype;
		if (!control) return false;
		if (control._my_app_company_logo_cropper_patched) return true;

		control._my_app_company_logo_cropper_patched = true;
		control.on_attach_doc_image = function () {
			this.set_upload_options();
			this.upload_options.restrictions.allowed_file_types = ["image/*"];
			// Keep default square crop for all Attach Image fields except company logo.
			this.upload_options.restrictions.crop_image_aspect_ratio =
				this.frm?.doctype === "Company" && this.df?.fieldname === "company_logo" ? NaN : 1;
			this.file_uploader = new frappe.ui.FileUploader(this.upload_options);
		};
		return true;
	}

	function wait_and_patch_company_logo_cropper() {
		if (patch_company_logo_cropper()) return;
		const timer = setInterval(() => {
			if (patch_company_logo_cropper()) clearInterval(timer);
		}, 300);
		setTimeout(() => clearInterval(timer), 10000);
	}

	function setup_default_umrah_data_import() {
		const data_import_handlers = frappe.ui?.form?.handlers?.["Data Import"];
		if (data_import_handlers?._my_app_default_umrah_import_setup) return;
		const set_umrah_reference_doctype = (frm) => {
			if (!frm.is_new() || frm.doc.reference_doctype) return;
			frm.set_value("reference_doctype", "Umrah_Customer");
		};
		frappe.ui.form.on("Data Import", {
			_my_app_default_umrah_import_setup: true,
			setup(frm) {
				set_umrah_reference_doctype(frm);
			},
			onload(frm) {
				set_umrah_reference_doctype(frm);
			},
			refresh(frm) {
				set_umrah_reference_doctype(frm);
			},
		});
	}

	frappe.ready(patch_umrah_sidebar_link);
	frappe.ready(patch_umrah_import_shortcut_button);
	frappe.ready(patch_umrah_data_import_bundle_loader);
	frappe.ready(wait_and_patch_umrah_data_import_fields);
	frappe.ready(wait_and_patch_company_logo_cropper);
	frappe.ready(setup_default_umrah_data_import);
})();
