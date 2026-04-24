from erpnext.selling.doctype.customer.customer import Customer


class CustomCustomer(Customer):
	"""Compatibility shim for old cached hooks.

	The active hooks no longer override Customer. This class exists only so
	older running workers that still reference the previous path do not fail
	before they are restarted.
	"""

	pass
