// src/pages/company/CompanyRegister.jsx
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { createCompany, checkCompanyExists } from "../../api/company";

const EMPTY_FORM = {
  companyName: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  registrationNumber: "",
  contactPerson: "",
};

export default function CompanyHistory() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const title = useMemo(
    () => (editingId ? "Edit Company" : "Create Company"),
    [editingId]
  );

  const load = async () => {
    try {
      setLoading(true);
      const res = await getCompanies({ page, limit, q });
      setRows(res.data);
      setPages(res.pagination.pages);
    } catch (e) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [page]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      companyName: row.companyName || "",
      email: row.email || "",
      phone: row.phone || "",
      address: row.address || "",
      website: row.website || "",
      registrationNumber: row.registrationNumber || "",
      contactPerson: row.contactPerson || "",
    });
    setIsOpen(true);
  };

  // Fetch ALL companies (paginate) to check duplicate companyName
  const fetchAllCompanies = async () => {
    const all = [];
    let p = 1;
    const perPage = 100; // big page for fewer roundtrips
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await getCompanies({ page: p, limit: perPage, q: "" });
      all.push(...res.data);
      const totalPages = res.pagination.pages;
      if (p >= totalPages) break;
      p += 1;
    }
    return all;
  };

  const companyNameExists = async (name) => {
    const all = await fetchAllCompanies();
    const target = (name || "").trim().toLowerCase();
    return all.some(
      (c) => (c.companyName || "").trim().toLowerCase() === target
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form }; // no password, no status (backend should default to "pending")

      if (!editingId) {
        const exists = await checkCompanyExists(payload.companyName);
        if (exists) {
          return toast.error(
            "Company name already exists. Please choose another name."
          );
        }
        await createCompany(payload);
        toast.success("Created");
      }

      setIsOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <Toaster position="top-center" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold">Companies</h1>
        <button
          onClick={openCreate}
          className="btn btn-primary px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + New Company
        </button>
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by company name, contact, registration..."
          className="w-full sm:w-80 border rounded px-3 py-2"
        />
        <button className="px-4 py-2 rounded border bg-white hover:bg-gray-50">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-[800px] w-full">
          <thead className="bg-gray-50 text-left text-sm">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  No companies found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.companyName}</div>
                    <div className="text-gray-500 text-xs">
                      {r.registrationNumber || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-2">{r.email}</td>
                  <td className="px-3 py-2">{r.phone}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="px-2 py-1 rounded border hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => doDelete(r._id)}
                      className="px-2 py-1 rounded border hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 mt-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm">
          Page {page} / {pages}
        </div>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Drawer / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex justify-end z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white h-full p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Company Name</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Phone</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Address</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Website</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={form.website || ""}
                    onChange={(e) =>
                      setForm({ ...form, website: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Registration No.</label>
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={form.registrationNumber || ""}
                    onChange={(e) =>
                      setForm({ ...form, registrationNumber: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Contact Person</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={form.contactPerson || ""}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                  {editingId ? "Save Changes" : "Create Company"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
