const first = (o, keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null);

const ID_KEYS = ["id", "ID", "domain_id", "sub_domain_id", "subDomainID", "domainID",
  "department_id", "dept_id", "departmentID", "act_id", "rule_id", "state_id", "district_id",
  "court_type_id", "sub_court_type_id", "case_type_id", "bench_id"];
const LABEL_KEYS = ["name", "label", "domain_name", "sub_domain_name", "subdomain_name",
  "department_name", "dept_name", "departmentName", "act_name", "rule_name", "state_name",
  "district_name", "sub_court_type", "sub_court_type_name", "case_type", "case_type_name", "bench_name"];

export function toOptions(res) {
  const rows = res?.data?.data ?? res?.data ?? res ?? [];
  return (Array.isArray(rows) ? rows : []).map((r) => {
    const vals = Object.values(r || {});
    const value = first(r, ID_KEYS) ?? vals[0];
    const label = first(r, LABEL_KEYS) ?? vals[1] ?? vals[0];
    return { value: String(value), label: String(label ?? "") };
  });
}