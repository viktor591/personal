import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

/**
 * Eleven Founder Scoring App — v2
 * - Adds hard metrics (Age, Gender, Founder Type checklist)
 * - Expands categories/traits per Spec v2
 * - Removes score "3" (allowed: 1,2,4,5 and blank)
 * - Dynamic rubric editor (add/remove categories & traits); persists to localStorage
 * - CSV export includes hard metrics
 */

// ---- Types ----
export type Trait = {
  id: string;
  name: string;
  gating?: boolean;
};

export type Category = {
  id: string;
  name: string;
  traits: Trait[];
};

export type Ratings = Record<string, number | null>;
export type Evidence = Record<string, string>;

type FounderType = "Commercial" | "Product" | "Technical" | "Entrepreneur" | "Scientist";
type GenderType = "Male" | "Female" | "Other" | "Prefer not to say";

export type Assessment = {
  id: string;
  founder: string;
  company: string;
  stage: "Pre-seed" | "Seed" | "Series A" | "Other";
  rater: string;
  date: string;
  // Hard metrics
  age: number | null;
  gender: GenderType | "";
  founderTypes: FounderType[]; // checklist
  // Notes & scoring
  notes: string;
  ratings: Ratings;
  evidence: Evidence;
};

const STORAGE_KEY = "ELEVEN_SCORECARDS_V2";
const RUBRIC_KEY = "ELEVEN_RUBRIC_V2";

// ---- Default Rubric from Spec v2 ----
const DEFAULT_RUBRIC: Category[] = [
  {
    id: "main",
    name: "Main characteristics",
    traits: [
      { id: "superiority_complex", name: "Superiority Complex" },
      { id: "extraversion", name: "Extraversion" },
      { id: "clear_communicator", name: "Clear communicator (simplifies themes)" },
      { id: "commitment", name: "Commitment (focus on one business & mission)" },
    ],
  },
  {
    id: "grit",
    name: "Grit & Resilience",
    traits: [
      { id: "persistence", name: "Persistence under adversity" },
      { id: "energy", name: "Energy" },
    ],
  },
  {
    id: "learning",
    name: "Learning & Adaptability",
    traits: [
      { id: "agreeableness", name: "Agreeableness (moderate is best)" },
      { id: "speed_of_learning", name: "Speed of Learning (new learnings each board)" },
    ],
  },
  {
    id: "execution",
    name: "Execution & Ownership",
    traits: [
      { id: "bias_to_action", name: "Bias to action & speed (delivery speed)" },
      { id: "hustle", name: "Hustle (doing things that don’t scale)" },
      { id: "accountability", name: "Accountability & follow-through" },
      { id: "openness_to_experimentation", name: "Openness to experimentation" },
      { id: "speed_of_experimentation", name: "Speed of experimentation" },
      { id: "vision", name: "Vision (ability to see the big picture)" },
    ],
  },
  {
    id: "focus",
    name: "Focus & Prioritization",
    traits: [
      { id: "ruthless_prioritization", name: "Ruthless prioritization" },
      { id: "strategic_clarity", name: "Strategic clarity: milestones/OKRs" },
    ],
  },
  {
    id: "market",
    name: "Customer & Market Insight",
    traits: [
      { id: "fmf", name: "Founder–market fit: lived insight (domain expert)" },
      { id: "customer_obsession", name: "Customer obsession: time with users" },
    ],
  },
  {
    id: "commercial",
    name: "Commercial Drive",
    traits: [
      { id: "sales_story", name: "Salesmanship & storytelling" },
      { id: "fundraising", name: "Fundraising ability: narrative & process" },
    ],
  },
  {
    id: "team",
    name: "Team Leadership",
    traits: [
      { id: "talent_magnet", name: "Talent magnetism: attracts A-players" },
      { id: "culture_values", name: "Culture & values: standards & safety" },
    ],
  },
  {
    id: "judgment",
    name: "Judgment & Integrity",
    traits: [
      { id: "decision_quality", name: "Decision-making quality: structured thinking" },
      { id: "integrity", name: "Integrity & ethics (GATING)", gating: true },
    ],
  },
  {
    id: "experience",
    name: "Experience",
    traits: [
      { id: "serial_entrepreneurship", name: "Serial Entrepreneurship" },
      { id: "domain_expertise", name: "Domain Expertise" },
    ],
  },
];

// ---- Helpers ----
function average(nums: Array<number | null | undefined>): number | null {
  const fil = nums.filter((n): n is number => typeof n === "number");
  if (fil.length === 0) return null;
  const sum = fil.reduce((a, b) => a + b, 0);
  return +(sum / fil.length).toFixed(2);
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function bandFromComposite(c: number | null): string {
  if (c == null) return "—";
  if (c < 3.2) return "At-Risk";
  if (c < 3.6) return "Watchlist";
  if (c < 4.2) return "Solid";
  return "Top Quartile";
}

function calcCategoryAvg(category: Category, ratings: Ratings): number | null {
  const vals = category.traits.map((t) => ratings[t.id] ?? null);
  return average(vals);
}

function calcComposite(rubric: Category[], ratings: Ratings): number | null {
  const catAvgs = rubric.map((c) => calcCategoryAvg(c, ratings));
  return average(catAvgs);
}

function integrityGate(ratings: Ratings): "PASS" | "FAIL" | "—" {
  const val = ratings["integrity"];
  if (val == null) return "—";
  return val < 3 ? "FAIL" : "PASS";
}

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SCORE_OPTIONS = ["1", "2", "4", "5"]; // No "3"

const ALL_FOUNDER_TYPES: FounderType[] = ["Commercial", "Product", "Technical", "Entrepreneur", "Scientist"];

// ---- Rubric persistence ----
function loadRubric(): Category[] {
  try {
    const raw = localStorage.getItem(RUBRIC_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return cloneDeep(DEFAULT_RUBRIC);
}
function saveRubric(rubric: Category[]) {
  try {
    localStorage.setItem(RUBRIC_KEY, JSON.stringify(rubric));
  } catch {}
}

// ---- CSV export ----
function exportAssessmentsToCSV(rows: Assessment[], rubric: Category[]) {
  const headers = [
    "id","founder","company","stage","rater","date",
    "age","gender","founder_types",
    "notes",
    ...rubric.flatMap((c) => c.traits.map((t) => `${c.name} — ${t.name} (1–2–4–5)`)),
    ...rubric.map((c) => `${c.name} (avg)`),
    "Composite (avg of category avgs)",
    "Integrity Gate (PASS/FAIL)",
  ];
  const csvRows = [headers.join(",")];

  for (const a of rows) {
    const catAvgs = rubric.map((c) => calcCategoryAvg(c, a.ratings));
    const composite = calcComposite(rubric, a.ratings);
    const line = [
      a.id,
      `"${a.founder.replaceAll('"', '""')}"`,
      `"${a.company.replaceAll('"', '""')}"`,
      a.stage,
      `"${a.rater.replaceAll('"', '""')}"`,
      a.date,
      a.age ?? "",
      a.gender || "",
      `"${(a.founderTypes || []).join("|").replaceAll('"','""')}"`,
      `"${(a.notes || "").replaceAll('"', '""')}"`,
      ...rubric.flatMap((c) => c.traits.map((t) => (a.ratings[t.id] ?? ""))),
      ...catAvgs.map((v) => (v ?? "")),
      composite ?? "",
      integrityGate(a.ratings),
    ];
    csvRows.push(line.join(","));
  }

  const blob = new Blob([csvRows.join("\\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eleven_founder_scores_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Main Component ----
export default function ElevenFounderScoringAppV2() {
  const [rubric, setRubric] = useState<Category[]>(() => loadRubric());
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTests, setShowTests] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(true);

  const emptyRatings = useMemo(() => Object.fromEntries(rubric.flatMap((c) => c.traits.map((t) => [t.id, null]))), [rubric]);
  const emptyEvidence = useMemo(() => Object.fromEntries(rubric.flatMap((c) => c.traits.map((t) => [t.id, ""]))), [rubric]);

  const [current, setCurrent] = useState<Assessment>(() => ({
    id: uuid(),
    founder: "",
    company: "",
    stage: "Pre-seed",
    rater: "",
    date: todayISO(),
    age: null,
    gender: "",
    founderTypes: [],
    notes: "",
    ratings: Object.fromEntries(DEFAULT_RUBRIC.flatMap((c) => c.traits.map((t) => [t.id, null]))),
    evidence: Object.fromEntries(DEFAULT_RUBRIC.flatMap((c) => c.traits.map((t) => [t.id, ""]))),
  }));

  // Load/save assessments
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAssessments(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
    } catch {}
  }, [assessments]);

  // When rubric changes, ensure current form has the right keys
  useEffect(() => {
    setCurrent((prev) => {
      const ratings: Ratings = { ...emptyRatings, ...prev.ratings };
      const evidence: Evidence = { ...emptyEvidence, ...prev.evidence };
      const allowedKeys = new Set(Object.keys(emptyRatings));
      Object.keys(ratings).forEach((k) => { if (!allowedKeys.has(k)) delete ratings[k]; });
      Object.keys(evidence).forEach((k) => { if (!allowedKeys.has(k)) delete evidence[k]; });
      return { ...prev, ratings, evidence };
    });
    saveRubric(rubric);
  }, [rubric, emptyRatings, emptyEvidence]);

  const categoryAvgs = useMemo(() => rubric.map((c) => calcCategoryAvg(c, current.ratings)), [current.ratings, rubric]);
  const composite = useMemo(() => calcComposite(rubric, current.ratings), [current.ratings, rubric]);
  const gate = useMemo(() => integrityGate(current.ratings), [current.ratings]);

  function resetForm() {
    setCurrent({
      id: uuid(),
      founder: "", company: "", stage: "Pre-seed", rater: "", date: todayISO(),
      age: null, gender: "", founderTypes: [],
      notes: "",
      ratings: cloneDeep(emptyRatings),
      evidence: cloneDeep(emptyEvidence),
    });
  }

  function saveAssessment() {
    if (!current.founder || !current.rater) {
      alert("Please add Founder and Rater before saving.");
      return;
    }
    setAssessments((prev) => {
      const idx = prev.findIndex((x) => x.id === current.id);
      const clean = cloneDeep(current);
      if (idx >= 0) {
        const next = cloneDeep(prev);
        next[idx] = clean;
        return next;
      } else {
        return [clean, ...prev];
      }
    });
  }

  function newCopyFromCurrent() {
    const copy = cloneDeep(current);
    copy.id = uuid();
    setCurrent(copy);
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected assessment(s)?`)) return;
    setAssessments((prev) => prev.filter((a) => !selectedIds.includes(a.id)));
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const aggregate = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selected = assessments.filter((a) => selectedIds.includes(a.id));
    const allTraitIds = rubric.flatMap((c) => c.traits.map((t) => t.id));
    const ratings: Ratings = Object.fromEntries(
      allTraitIds.map((tid) => {
        const vals = selected.map((a) => a.ratings[tid]).filter((v): v is number => typeof v === "number");
        return [tid, vals.length ? +((vals.reduce((s, n) => s + n, 0) / vals.length).toFixed(2)) : null];
      })
    );
    const evidence: Evidence = Object.fromEntries(allTraitIds.map((tid) => [tid, "— (multiple)"]));
    const faux: Assessment = {
      id: "aggregate",
      founder: selected[0]?.founder || "—",
      company: selected[0]?.company || "—",
      stage: selected[0]?.stage || "Pre-seed",
      rater: `Aggregate of ${selected.length} assessments`,
      date: todayISO(),
      age: null,
      gender: "",
      founderTypes: [],
      notes: "",
      ratings,
      evidence,
    };
    return faux;
  }, [selectedIds, assessments, rubric]);

  function addCategory() {
    const name = prompt("New category name?");
    if (!name) return;
    const id = name.toLowerCase().replace(/\\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 40) || `cat_${Date.now()}`;
    setRubric((prev) => [...prev, { id, name, traits: [] }]);
  }
  function removeCategory(catId: string) {
    if (!confirm("Remove this category (and its traits)?")) return;
    setRubric((prev) => prev.filter((c) => c.id !== catId));
  }
  function addTrait(catId: string) {
    const name = prompt("Trait name?");
    if (!name) return;
    const gating = confirm("Is this a GATING trait? Click OK for Yes, Cancel for No.");
    const id = name.toLowerCase().replace(/\\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50) || `trait_${Date.now()}`;
    setRubric((prev) => prev.map((c) => (c.id === catId ? { ...c, traits: [...c.traits, { id, name, gating }] } : c)));
  }
  function removeTrait(catId: string, traitId: string) {
    setRubric((prev) => prev.map((c) => (c.id === catId ? { ...c, traits: c.traits.filter((t) => t.id !== traitId) } : c)));
  }
  function resetRubric() {
    if (!confirm("Reset rubric to Spec v2 defaults?")) return;
    setRubric(cloneDeep(DEFAULT_RUBRIC));
  }

  type TCase = { name: string; pass: boolean; got: any; expected: any };
  const tests: TCase[] = useMemo(() => {
    const allTraitIds = rubric.flatMap((c) => c.traits.map((t) => t.id));
    const all4: Ratings = Object.fromEntries(allTraitIds.map((id) => [id, 4]));
    const cat = rubric[0];
    const catNull = calcCategoryAvg(cat, Object.fromEntries(cat.traits.map(t => [t.id, null])) as Ratings);
    return [
      { name: "average([1,2,4,5]) = 3", pass: average([1,2,4,5]) === 3, got: average([1,2,4,5]), expected: 3 },
      { name: "calcComposite(all 4s) = 4", pass: calcComposite(rubric, all4) === 4, got: calcComposite(rubric, all4), expected: 4 },
      { name: "calcCategoryAvg(nulls) = null", pass: catNull === null, got: catNull, expected: null },
      { name: "integrityGate(2) = FAIL", pass: integrityGate({ integrity: 2 } as Ratings) === "FAIL", got: integrityGate({ integrity: 2 } as Ratings), expected: "FAIL" },
      { name: "integrityGate(4) = PASS", pass: integrityGate({ integrity: 4 } as Ratings) === "PASS", got: integrityGate({ integrity: 4 } as Ratings), expected: "PASS" },
    ];
  }, [rubric]);

  return (
    <div className="mx-auto" style={{maxWidth: '1200px', padding: 24}}>
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
        <div>
          <h1 style={{fontSize: 22, fontWeight: 600}}>Eleven Ventures — Founder Traits Scorecard (v2)</h1>
          <p style={{fontSize: 12, color:'#555'}}>Dynamic rubric • 1/2/4/5 scale • Integrity gate • Local save • CSV export • Multi-rater aggregate</p>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize: 12}}>Show self-tests</span>
            <Switch checked={showTests} onCheckedChange={(v) => setShowTests(Boolean(v))} />
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize: 12}}>Show rubric editor</span>
            <Switch checked={showEditor} onCheckedChange={(v) => setShowEditor(Boolean(v))} />
          </div>
          <Button onClick={() => exportAssessmentsToCSV(assessments, rubric)}>
            Export all CSV
          </Button>
          <Button variant="secondary" onClick={() => aggregate && exportAssessmentsToCSV([aggregate], rubric)} disabled={!aggregate}>
            Export aggregate CSV
          </Button>
        </div>
      </header>

      <div className="grid" style={{display:'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
        <div style={{gridColumn: 'span 2'}}>
          <Card>
            <CardHeader>
              <CardTitle>Assessment Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                <div>
                  <label style={{fontSize:12}}>Founder</label>
                  <Input placeholder="Full name" value={current.founder} onChange={(e) => setCurrent({ ...current, founder: (e.target as HTMLInputElement).value })} />
                </div>
                <div>
                  <label style={{fontSize:12}}>Company</label>
                  <Input placeholder="Company" value={current.company} onChange={(e) => setCurrent({ ...current, company: (e.target as HTMLInputElement).value })} />
                </div>
                <div>
                  <label style={{fontSize:12}}>Stage</label>
                  <Select value={current.stage} onValueChange={(v: any) => setCurrent({ ...current, stage: v })}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Stage"/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pre-seed">Pre-seed</SelectItem>
                      <SelectItem value="Seed">Seed</SelectItem>
                      <SelectItem value="Series A">Series A</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={{fontSize:12}}>Rater</label>
                  <Input placeholder="Your name" value={current.rater} onChange={(e) => setCurrent({ ...current, rater: (e.target as HTMLInputElement).value })} />
                </div>
                <div>
                  <label style={{fontSize:12}}>Date</label>
                  <Input type="date" value={current.date} onChange={(e) => setCurrent({ ...current, date: (e.target as HTMLInputElement).value })} />
                </div>
              </div>

              <div style={{borderTop:'1px solid #e5e7eb', margin:'12px 0'}} />

              <div>
                <div style={{fontSize:12, fontWeight:500}}>Founder Profile — Hard Metrics</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:8}}>
                  <div>
                    <label style={{fontSize:12}}>Age</label>
                    <Input type="number" min={15} max={100} placeholder="e.g., 34" value={current.age ?? ""} onChange={(e) => setCurrent({ ...current, age: (e.target as HTMLInputElement).value === "" ? null : Number((e.target as HTMLInputElement).value) })} />
                  </div>
                  <div>
                    <label style={{fontSize:12}}>Gender</label>
                    <Select value={current.gender || undefined} onValueChange={(v: any) => setCurrent({ ...current, gender: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div style={{fontSize:12}}>Founder Type (Checklist)</div>
                    <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
                      {ALL_FOUNDER_TYPES.map((ft) => {
                        const checked = current.founderTypes.includes(ft);
                        return (
                          <label key={ft} style={{display:'flex', alignItems:'center', gap:8, fontSize:12, border:'1px solid #e5e7eb', borderRadius:6, padding:'4px 8px', cursor:'pointer'}}>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                setCurrent((prev) => ({
                                  ...prev,
                                  founderTypes: checked
                                    ? prev.founderTypes.filter((x) => x !== ft)
                                    : [...prev.founderTypes, ft],
                                }));
                              }}
                            />
                            {ft}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{marginTop:8}}>
                <label style={{fontSize:12}}>Evidence / Notes (overall)</label>
                <Textarea placeholder="Link examples, artifacts, incidents, customer quotes…" value={current.notes} onChange={(e) => setCurrent({ ...current, notes: (e.target as HTMLTextAreaElement).value })} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Live Score Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                {rubric.map((cat, i) => (
                  <div key={cat.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
                    <span>{cat.name}</span>
                    <span style={{fontWeight:600}}>{categoryAvgs[i] ?? "—"}</span>
                  </div>
                ))}
              </div>
              <div style={{borderTop:'1px solid #e5e7eb', margin:'12px 0'}} />
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:12, color:'#555'}}>Composite (avg of category avgs)</div>
                  <div style={{fontSize:20, fontWeight:600}}>{composite ?? "—"}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12, color:'#555'}}>Band</div>
                  <Badge variant="secondary" className="text-sm">{bandFromComposite(composite)}</Badge>
                </div>
              </div>
              <div style={{borderRadius:12, padding:12, background: gate === "FAIL" ? "#fef2f2" : "#f8fafc", border: '1px solid ' + (gate === "FAIL" ? "#fecaca" : "#e5e7eb"), marginTop:8}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <div style={{fontSize:12, fontWeight:500}}>Integrity Gate</div>
                  <Badge variant={gate === "FAIL" ? "destructive" : "secondary"}>{gate}</Badge>
                </div>
                <p style={{fontSize:11, color:'#666', marginTop:4}}>Integrity &lt; 3 triggers partner review.</p>
              </div>
              <div style={{display:'flex', gap:8, marginTop:8}}>
                <Button onClick={saveAssessment}>Save</Button>
                <Button variant="outline" onClick={newCopyFromCurrent}>Duplicate as new</Button>
                <Button variant="ghost" onClick={resetForm}>New blank</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16}}>
        {rubric.map((cat) => (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle>{cat.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {cat.traits.map((t) => {
                const value = current.ratings[t.id];
                const evidence = current.evidence[t.id] || "";
                return (
                  <div key={t.id} style={{borderRadius:12, border:'1px solid #e5e7eb', padding:12, marginBottom:12}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontWeight:600}}>{t.name}</span>
                        {t.gating && <Badge variant="outline">Gating</Badge>}
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <Tooltip>
                          <TooltipTrigger><Badge variant="secondary" className="cursor-default">Scale</Badge></TooltipTrigger>
                          <TooltipContent />
                        </Tooltip>
                        <Select
                          value={value != null ? String(value) : undefined}
                          onValueChange={(v) => setCurrent({
                            ...current,
                            ratings: { ...current.ratings, [t.id]: Number(v) },
                          })}
                        >
                          <SelectTrigger className="w-32"><SelectValue placeholder="1/2/4/5"/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      <Textarea
                        placeholder="Evidence for this trait (examples, artifacts, incidents)"
                        value={evidence}
                        onChange={(e) => setCurrent({ ...current, evidence: { ...current.evidence, [t.id]: (e.target as HTMLTextAreaElement).value } })}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card style={{marginTop:16}}>
        <CardHeader>
          <CardTitle>Saved Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p style={{fontSize:12, color:'#555'}}>No assessments yet. Save one to see it here.</p>
          ) : (
            <div style={{overflowX:'auto'}}>
              <Table>
                <TableCaption>Select rows to aggregate multi-rater scores. Click a row to load/edit.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Founder</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Rater</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Types</TableHead>
                    <TableHead>Composite</TableHead>
                    <TableHead>Integrity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => (
                    <TableRow key={a.id} onClick={() => setCurrent(cloneDeep(a))} style={{cursor:'pointer'}}>
                      <TableCell onClick={(e) => { e.stopPropagation(); }}>
                        <Checkbox checked={selectedIds.includes(a.id)} onCheckedChange={() => {
                          setSelectedIds((prev) => (prev.includes(a.id) ? prev.filter((x) => x !== a.id) : [...prev, a.id]));
                        }} />
                      </TableCell>
                      <TableCell><strong>{a.founder}</strong></TableCell>
                      <TableCell>{a.company}</TableCell>
                      <TableCell>{a.stage}</TableCell>
                      <TableCell>{a.rater}</TableCell>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.age ?? "—"}</TableCell>
                      <TableCell>{a.gender || "—"}</TableCell>
                      <TableCell>{(a.founderTypes || []).join(", ") || "—"}</TableCell>
                      <TableCell>{calcComposite(rubric, a.ratings) ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={integrityGate(a.ratings) === "FAIL" ? "destructive" : "secondary"}>
                          {integrityGate(a.ratings)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
            <Button variant="destructive" onClick={() => {
              if (selectedIds.length === 0) return;
              if (!confirm(`Delete ${selectedIds.length} selected assessment(s)?`)) return;
              setAssessments((prev) => prev.filter((a) => !selectedIds.includes(a.id)));
              setSelectedIds([]);
            }} disabled={selectedIds.length === 0}>Delete selected</Button>
            <Button variant="secondary" onClick={() => exportAssessmentsToCSV(assessments.filter(a => selectedIds.includes(a.id)), rubric)} disabled={selectedIds.length === 0}>Export selected CSV</Button>
          </div>

          {aggregate && (
            <div style={{marginTop:16, border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:12, color:'#555'}}>Aggregate</div>
                  <div style={{fontWeight:600}}>{aggregate.rater}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12, color:'#555'}}>Composite</div>
                  <div style={{fontSize:18, fontWeight:600}}>{calcComposite(rubric, aggregate.ratings) ?? "—"}</div>
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:8}}>
                {rubric.map((c) => (
                  <div key={c.id} style={{border:'1px solid #e5e7eb', borderRadius:10, padding:8, background:'#f8fafc'}}>
                    <div style={{fontSize:11, color:'#666'}}>{c.name}</div>
                    <div style={{fontWeight:600}}>{calcCategoryAvg(c, aggregate.ratings) ?? "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <Card style={{marginTop:16}}>
          <CardHeader>
            <CardTitle>Rubric Editor (everyone can change)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{display:'flex', gap:8}}>
              <Button onClick={addCategory}>Add category</Button>
              <Button variant="outline" onClick={resetRubric}>Reset to Spec v2 defaults</Button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12}}>
              {rubric.map((cat) => (
                <div key={cat.id} style={{border:'1px solid #e5e7eb', borderRadius:12, padding:12}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{fontWeight:600}}>{cat.name}</div>
                    <div style={{display:'flex', gap:8}}>
                      <Button size="sm" variant="outline" onClick={() => addTrait(cat.id)}>Add trait</Button>
                      <Button size="sm" variant="destructive" onClick={() => removeCategory(cat.id)}>Remove category</Button>
                    </div>
                  </div>
                  <div style={{marginTop:12, display:'grid', gap:8}}>
                    {cat.traits.map((t) => (
                      <div key={t.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px'}}>
                        <div style={{fontSize:13, display:'flex', alignItems:'center', gap:8}}>
                          <span>{t.name}</span>
                          {t.gating && <Badge variant="outline">Gating</Badge>}
                        </div>
                        <div style={{display:'flex', gap:8}}>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const name = prompt("Rename trait", t.name) || t.name;
                            const gating = confirm("Is this trait GATING? OK=Yes, Cancel=No");
                            setRubric(prev => prev.map(c => c.id === cat.id ? {
                              ...c, traits: c.traits.map(tt => tt.id === t.id ? { ...tt, name, gating } : tt)
                            } : c));
                          }}>Rename</Button>
                          <Button size="sm" variant="destructive" onClick={() => removeTrait(cat.id, t.id)}>Remove</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showTests && (
        <Card style={{marginTop:16}}>
          <CardHeader><CardTitle>Built-in Self Tests</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Got</TableHead>
                  <TableHead>Expected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "average([1,2,4,5]) = 3", got: average([1,2,4,5]), expected: 3 },
                  { name: "calcComposite(all 4s) = 4", got: calcComposite(DEFAULT_RUBRIC, Object.fromEntries(DEFAULT_RUBRIC.flatMap(c=>c.traits.map(t=>[t.id,4])))), expected: 4 },
                  { name: "calcCategoryAvg(nulls) = null", got: calcCategoryAvg(DEFAULT_RUBRIC[0], Object.fromEntries(DEFAULT_RUBRIC[0].traits.map(t=>[t.id,null])) as Ratings), expected: null },
                  { name: "integrityGate(2) = FAIL", got: integrityGate({ integrity: 2 } as Ratings), expected: "FAIL" },
                  { name: "integrityGate(4) = PASS", got: integrityGate({ integrity: 4 } as Ratings), expected: "PASS" },
                  { name: "average([]) = null", got: average([]), expected: null },
                  { name: "average([1,null,5]) = 3", got: average([1, null, 5] as any), expected: 3 },
                  { name: "integrityGate(undefined) = —", got: integrityGate({} as Ratings), expected: "—" },
                  { name: "bandFromComposite(null) = —", got: bandFromComposite(null), expected: "—" },
                  { name: "bandFromComposite(3.19) = At-Risk", got: bandFromComposite(3.19), expected: "At-Risk" },
                  { name: "bandFromComposite(3.2) = Watchlist", got: bandFromComposite(3.2), expected: "Watchlist" },
                  { name: "bandFromComposite(3.6) = Solid", got: bandFromComposite(3.6), expected: "Solid" },
                  { name: "bandFromComposite(4.2) = Top Quartile", got: bandFromComposite(4.2), expected: "Top Quartile" },
                  { name: "calcCategoryAvg(mixed 1 & 5) = 3", got: calcCategoryAvg(DEFAULT_RUBRIC[0], Object.fromEntries(DEFAULT_RUBRIC[0].traits.map((t,i)=>[t.id, i===0?1:(i===2?5:null)])) as Ratings), expected: 3 },
                ].map((t, i) => {
                  const pass = t.got === t.expected;
                  return (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell><Badge variant={pass ? "secondary" : "destructive"}>{pass ? "PASS" : "FAIL"}</Badge></TableCell>
                      <TableCell>{String(t.got)}</TableCell>
                      <TableCell>{String(t.expected)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <footer style={{fontSize:11, color:'#555', textAlign:'center', paddingTop:24}}>
        Bias check: Would I rate this the same without knowing school, ex-employer, accent, or gender?
      </footer>
    </div>
  );
}
