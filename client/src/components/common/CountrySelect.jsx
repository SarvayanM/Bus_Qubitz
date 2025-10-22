import COUNTRIES from "../../data/countries";

export default function CountrySelect({ value, onChange }) {
  return (
    <select
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.dial}>
          {c.name} ({c.dial})
        </option>
      ))}
    </select>
  );
}
