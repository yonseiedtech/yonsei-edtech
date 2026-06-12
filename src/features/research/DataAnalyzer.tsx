"use client";

/**
 * 데이터 분석기 (2026-06-12, 사이클 35) — "SPSS처럼 붙여넣고 표 받기"
 *
 * 엑셀/CSV 데이터를 붙여넣으면 stat-engine(순수 함수)으로 분석하고,
 * 학위논문 관행 형식의 표·보고 문장을 생성해 결과 장에 삽입한다.
 * 데이터는 브라우저 안에서만 처리되며 서버로 전송·저장되지 않는다.
 *
 * ⚠ 작성 보조용 빠른 분석 — 제출 전 최종 수치는 SPSS·R 로 재확인을 안내.
 */

import { useMemo, useState } from "react";
import { Calculator, ClipboardCopy, FileInput, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseClipboard, type ParsedData } from "./data-parse";
import {
  descriptives,
  independentT,
  pairedT,
  onewayAnova,
  pearson,
  chiSquare,
  cronbachAlpha,
  ancova,
} from "./stat-engine";

type AnalysisKind =
  | "desc"
  | "ttest_ind"
  | "ttest_paired"
  | "anova"
  | "ancova"
  | "corr"
  | "chisq"
  | "alpha";

const KIND_LABELS: Record<AnalysisKind, string> = {
  desc: "기술통계",
  ttest_ind: "독립표본 t검정",
  ttest_paired: "대응표본 t검정",
  anova: "일원 ANOVA",
  ancova: "ANCOVA (공변량 1)",
  corr: "상관분석",
  chisq: "카이제곱(χ²)",
  alpha: "신뢰도 (Cronbach's α)",
};

const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const fmtP = (p: number) => (!Number.isFinite(p) ? "—" : p < 0.001 ? "< .001" : `= ${p.toFixed(3).replace(/^0/, "")}`);

/** 집단열 기준으로 숫자 종속변수를 그룹 분리 */
function splitByGroup(
  data: ParsedData,
  groupCol: number,
  valueCol: number,
): { label: string; values: number[] }[] {
  const map = new Map<string, number[]>();
  for (let r = 0; r < data.rowCount; r++) {
    const g = data.columns[groupCol][r];
    const v = data.numeric[valueCol][r];
    if (!g || Number.isNaN(v)) continue;
    const list = map.get(g) ?? [];
    list.push(v);
    map.set(g, list);
  }
  return [...map.entries()].map(([label, values]) => ({ label, values }));
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 생성된 표·보고 텍스트를 결과 장에 삽입 */
  onInsertText?: (text: string) => void;
  readOnly?: boolean;
}

export default function DataAnalyzer({ open, onOpenChange, onInsertText, readOnly }: Props) {
  const [raw, setRaw] = useState("");
  const [kind, setKind] = useState<AnalysisKind>("ttest_ind");
  // 변수 역할 (열 인덱스)
  const [groupCol, setGroupCol] = useState<number>(-1);
  const [depCol, setDepCol] = useState<number>(-1);
  const [covCol, setCovCol] = useState<number>(-1);
  const [preCol, setPreCol] = useState<number>(-1);
  const [postCol, setPostCol] = useState<number>(-1);
  const [multiCols, setMultiCols] = useState<number[]>([]);
  const [catCol2, setCatCol2] = useState<number>(-1);
  const [result, setResult] = useState<string | null>(null);

  const data = useMemo(() => (raw.trim() ? parseClipboard(raw) : null), [raw]);

  function toggleMulti(j: number) {
    setMultiCols((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  }

  function numericValues(col: number): number[] {
    return data ? data.numeric[col].filter((v) => !Number.isNaN(v)) : [];
  }

  function run() {
    if (!data) return;
    try {
      let out = "";
      if (kind === "desc") {
        const cols = multiCols.length > 0 ? multiCols : data.headers.map((_, j) => j).filter((j) => data.isNumeric[j]);
        out += "<표 Ⅳ-_> 주요 변인 기술통계\n변인 | N | M | SD | 왜도 | 첨도 | 최소 | 최대\n";
        for (const j of cols) {
          const d = descriptives(numericValues(j));
          out += `${data.headers[j]} | ${d.n} | ${fmt(d.mean)} | ${fmt(d.sd)} | ${fmt(d.skewness)} | ${fmt(d.kurtosis)} | ${fmt(d.min)} | ${fmt(d.max)}\n`;
        }
        const bad = cols.map((j) => descriptives(numericValues(j))).some((d) => Math.abs(d.skewness) >= 2 || Math.abs(d.kurtosis) >= 7);
        out += bad
          ? "\n일부 변인의 왜도·첨도가 정규성 기준(|왜도| < 2, |첨도| < 7)을 벗어났다 — 변환 또는 비모수 검정을 검토하세요."
          : "\n모든 변인의 왜도와 첨도가 |왜도| < 2, |첨도| < 7 범위에 있어 정규성 가정에 큰 무리가 없는 것으로 판단하였다.";
      } else if (kind === "ttest_ind") {
        if (groupCol < 0 || depCol < 0) throw new Error("집단 변수와 종속 변수를 선택하세요.");
        const groups = splitByGroup(data, groupCol, depCol);
        if (groups.length !== 2) throw new Error(`집단 변수의 고유값이 2개여야 합니다 (현재 ${groups.length}개).`);
        const r = independentT(groups[0].values, groups[1].values);
        const useWelch = r.levene.p < 0.05;
        const tt = useWelch ? r.welch : r.student;
        out += `<표 Ⅳ-_> ${data.headers[groupCol]}에 따른 ${data.headers[depCol]} 차이 (독립표본 t검정)\n`;
        out += `집단 | N | M | SD | t | p | Cohen's d\n`;
        out += `${groups[0].label} | ${r.group1.n} | ${fmt(r.group1.mean)} | ${fmt(r.group1.sd)} | ${fmt(tt.t)} | ${fmtP(tt.p).replace("= ", "")} | ${fmt(r.cohenD)}\n`;
        out += `${groups[1].label} | ${r.group2.n} | ${fmt(r.group2.mean)} | ${fmt(r.group2.sd)} |  |  |\n\n`;
        out += `Levene의 등분산성 검정 결과 ${r.levene.p < 0.05 ? `등분산 가정이 기각되어(F = ${fmt(r.levene.F)}, p ${fmtP(r.levene.p)}) Welch 보정 결과를 보고하였다` : `분산의 동질성 가정이 충족되었다(F = ${fmt(r.levene.F)}, p ${fmtP(r.levene.p)})`}. `;
        out += `분석 결과 두 집단 간 ${data.headers[depCol]}에 ${tt.p < 0.05 ? "통계적으로 유의한 차이가 있었다" : "통계적으로 유의한 차이가 없었다"}(t(${fmt(tt.df, useWelch ? 1 : 0)}) = ${fmt(tt.t)}, p ${fmtP(tt.p)}, Cohen's d = ${fmt(r.cohenD)}).`;
      } else if (kind === "ttest_paired") {
        if (preCol < 0 || postCol < 0) throw new Error("사전·사후 변수를 선택하세요.");
        const pre: number[] = [];
        const post: number[] = [];
        for (let i = 0; i < data.rowCount; i++) {
          const a = data.numeric[preCol][i];
          const b = data.numeric[postCol][i];
          if (!Number.isNaN(a) && !Number.isNaN(b)) {
            pre.push(a);
            post.push(b);
          }
        }
        const r = pairedT(pre, post);
        const dp = descriptives(pre);
        const dq = descriptives(post);
        out += `<표 Ⅳ-_> ${data.headers[preCol]}·${data.headers[postCol]} 대응표본 t검정\n`;
        out += `구분 | N | M | SD | t | df | p | Cohen's d\n`;
        out += `${data.headers[preCol]} | ${dp.n} | ${fmt(dp.mean)} | ${fmt(dp.sd)} | ${fmt(r.t)} | ${r.df} | ${fmtP(r.p).replace("= ", "")} | ${fmt(r.cohenD)}\n`;
        out += `${data.headers[postCol]} | ${dq.n} | ${fmt(dq.mean)} | ${fmt(dq.sd)} |  |  |  |\n\n`;
        out += `사전-사후 차이는 ${r.p < 0.05 ? "통계적으로 유의하였다" : "통계적으로 유의하지 않았다"}(t(${r.df}) = ${fmt(r.t)}, p ${fmtP(r.p)}).`;
      } else if (kind === "anova") {
        if (groupCol < 0 || depCol < 0) throw new Error("집단 변수와 종속 변수를 선택하세요.");
        const groups = splitByGroup(data, groupCol, depCol);
        if (groups.length < 2) throw new Error("집단이 2개 이상이어야 합니다.");
        const r = onewayAnova(groups.map((g) => g.values));
        out += `<표 Ⅳ-_> ${data.headers[groupCol]}에 따른 ${data.headers[depCol]} 기술통계\n집단 | N | M | SD\n`;
        groups.forEach((g, i) => {
          out += `${g.label} | ${r.groups[i].n} | ${fmt(r.groups[i].mean)} | ${fmt(r.groups[i].sd)}\n`;
        });
        out += `\n<표 Ⅳ-_> 분산분석(ANOVA) 결과\n변량원 | SS | df | MS | F | p | η²\n`;
        out += `집단 간 | ${fmt(r.ssb)} | ${r.dfb} | ${fmt(r.msb)} | ${fmt(r.F)} | ${fmtP(r.p).replace("= ", "")} | ${fmt(r.eta2, 3)}\n`;
        out += `집단 내 | ${fmt(r.ssw)} | ${r.dfw} | ${fmt(r.msw)} |  |  |\n\n`;
        out += `분석 결과 집단 간 차이는 ${r.p < 0.05 ? "통계적으로 유의하였다" : "통계적으로 유의하지 않았다"}(F(${r.dfb}, ${r.dfw}) = ${fmt(r.F)}, p ${fmtP(r.p)}, η² = ${fmt(r.eta2, 3)}).`;
        if (r.p < 0.05) out += " 사후검정(Tukey HSD 등)은 SPSS 등에서 수행해 함께 보고하세요.";
      } else if (kind === "ancova") {
        if (groupCol < 0 || depCol < 0 || covCol < 0) throw new Error("집단·종속·공변량 변수를 선택하세요.");
        const labels = splitByGroup(data, groupCol, depCol).map((g) => g.label);
        const inputs = labels.map((label) => {
          const y: number[] = [];
          const cov: number[] = [];
          for (let i = 0; i < data.rowCount; i++) {
            if (data.columns[groupCol][i] !== label) continue;
            const yv = data.numeric[depCol][i];
            const cv = data.numeric[covCol][i];
            if (!Number.isNaN(yv) && !Number.isNaN(cv)) {
              y.push(yv);
              cov.push(cv);
            }
          }
          return { label, y, cov };
        });
        const r = ancova(inputs);
        if (!r) throw new Error("ANCOVA 계산에 실패했습니다 — 데이터를 확인하세요.");
        out += `공분산분석의 전제인 회귀계수 동질성 검정 결과, 집단과 공변량의 상호작용이 ${r.homogeneity.p > 0.05 ? `유의하지 않아(F(${r.homogeneity.df1}, ${r.homogeneity.df2}) = ${fmt(r.homogeneity.F)}, p ${fmtP(r.homogeneity.p)}) 가정을 충족하였다` : `유의하여(F = ${fmt(r.homogeneity.F)}, p ${fmtP(r.homogeneity.p)}) 가정이 위배되었다 — ANCOVA 해석에 주의가 필요하다`}.\n\n`;
        out += `<표 Ⅳ-_> 공분산분석(ANCOVA) 결과 (공변량: ${data.headers[covCol]})\n변량원 | SS | df | MS | F | p | partial η²\n`;
        out += `공변량 | ${fmt(r.covariate.ss)} | ${r.covariate.df} | ${fmt(r.covariate.ms)} | ${fmt(r.covariate.F)} | ${fmtP(r.covariate.p).replace("= ", "")} |\n`;
        out += `집단 | ${fmt(r.group.ss)} | ${r.group.df} | ${fmt(r.group.ms)} | ${fmt(r.group.F)} | ${fmtP(r.group.p).replace("= ", "")} | ${fmt(r.group.partialEta2, 3)}\n`;
        out += `오차 | ${fmt(r.error.ss)} | ${r.error.df} | ${fmt(r.error.ms)} |  |  |\n\n`;
        out += `<표 Ⅳ-_> 집단별 조정평균\n집단 | N | M | SD | 조정 M\n`;
        r.groups.forEach((g) => {
          out += `${g.label} | ${g.n} | ${fmt(g.meanY)} | ${fmt(g.sdY)} | ${fmt(g.adjustedMean)}\n`;
        });
        out += `\n${data.headers[covCol]}을 공변량으로 통제한 후 집단 간 ${data.headers[depCol]} 차이는 ${r.group.p < 0.05 ? "통계적으로 유의하였다" : "통계적으로 유의하지 않았다"}(F(${r.group.df}, ${r.error.df}) = ${fmt(r.group.F)}, p ${fmtP(r.group.p)}, partial η² = ${fmt(r.group.partialEta2, 3)}).`;
      } else if (kind === "corr") {
        const cols = multiCols.filter((j) => data.isNumeric[j]);
        if (cols.length < 2) throw new Error("숫자 변수를 2개 이상 선택하세요.");
        out += `<표 Ⅳ-_> 주요 변인 간 상관계수\n변인 | ${cols.map((_, i) => i + 1).join(" | ")}\n`;
        cols.forEach((j, i) => {
          const cells: string[] = [];
          for (let k2 = 0; k2 < cols.length; k2++) {
            if (k2 > i) cells.push("");
            else if (k2 === i) cells.push("1");
            else {
              const pr = pearson(numericValues(cols[k2]), numericValues(j));
              cells.push(`${fmt(pr.r, 2).replace(/^(-?)0\./, "$1.")}${pr.p < 0.01 ? "**" : pr.p < 0.05 ? "*" : ""}`);
            }
          }
          out += `${i + 1}. ${data.headers[j]} | ${cells.join(" | ")}\n`;
        });
        out += "*p < .05, **p < .01\n";
        out += "\n주의: 변인 쌍별 결측 제거 방식이 통계 패키지와 다를 수 있습니다 — 결측이 있다면 SPSS 결과로 확인하세요.";
      } else if (kind === "chisq") {
        if (groupCol < 0 || catCol2 < 0) throw new Error("범주 변수 2개를 선택하세요.");
        const rowsVals = [...new Set(data.columns[groupCol].filter(Boolean))];
        const colsVals = [...new Set(data.columns[catCol2].filter(Boolean))];
        const table = rowsVals.map((rv) =>
          colsVals.map(
            (cv) =>
              data.columns[groupCol].filter((g, i) => g === rv && data.columns[catCol2][i] === cv).length,
          ),
        );
        const r = chiSquare(table);
        out += `<표 Ⅳ-_> ${data.headers[groupCol]} × ${data.headers[catCol2]} 교차분석 (χ²)\n`;
        out += `구분 | ${colsVals.join(" | ")} | 계\n`;
        rowsVals.forEach((rv, i) => {
          out += `${rv} | ${table[i].join(" | ")} | ${table[i].reduce((a, b) => a + b, 0)}\n`;
        });
        out += `\nχ² = ${fmt(r.chi2)}, df = ${r.df}, p ${fmtP(r.p)}\n`;
        out += r.lowExpectedRatio > 0.2
          ? `\n기대빈도 5 미만인 셀이 ${Math.round(r.lowExpectedRatio * 100)}%로 기준(20%)을 초과합니다 — Fisher 정확검정을 검토하세요.`
          : `\n기대빈도 5 미만 셀 비율이 ${Math.round(r.lowExpectedRatio * 100)}%로 기준(20% 이하)을 충족하였다.`;
      } else if (kind === "alpha") {
        const cols = multiCols.filter((j) => data.isNumeric[j]);
        if (cols.length < 2) throw new Error("문항 변수를 2개 이상 선택하세요.");
        const complete: number[][] = cols.map(() => []);
        for (let i = 0; i < data.rowCount; i++) {
          if (cols.some((j) => Number.isNaN(data.numeric[j][i]))) continue;
          cols.forEach((j, idx) => complete[idx].push(data.numeric[j][i]));
        }
        const r = cronbachAlpha(complete);
        out += `${cols.length}개 문항(${cols.map((j) => data.headers[j]).join(", ")})의 내적 일관성 신뢰도 Cronbach's α는 ${fmt(r.alpha, 3)}으로 나타났다 (N = ${r.n}).`;
        if (r.alpha < 0.6) out += " α가 .60 미만으로 낮습니다 — 역채점 문항이 변환되었는지 먼저 확인하세요.";
      }

      out += "\n\n※ 브라우저 내 빠른 분석 결과입니다 — 제출 전 SPSS·R 등으로 최종 수치를 확인하세요.";
      setResult(out);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "분석에 실패했습니다.");
    }
  }

  const needsGroupDep = kind === "ttest_ind" || kind === "anova" || kind === "ancova";
  const needsMulti = kind === "desc" || kind === "corr" || kind === "alpha";

  function colSelect(label: string, value: number, onChange: (v: number) => void, numericOnly: boolean) {
    return (
      <label className="flex items-center gap-1.5 text-[11px]">
        <span className="shrink-0 font-semibold">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-7 rounded-md border bg-background px-1.5 text-[11px]"
        >
          <option value={-1}>선택…</option>
          {data?.headers.map((h, j) =>
            !numericOnly || data.isNumeric[j] ? (
              <option key={j} value={j}>
                {h}
              </option>
            ) : null,
          )}
        </select>
      </label>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={17} className="text-primary" />
            데이터 분석 — 붙여넣고 표 받기
          </DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground">
          엑셀에서 변수명 행을 포함해 복사한 뒤 붙여넣으세요. 데이터는 브라우저 안에서만 계산되며 서버로
          전송·저장되지 않습니다.
        </p>

        <Textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setResult(null);
          }}
          rows={5}
          placeholder={"집단\t사전\t사후\n실험\t3.2\t4.1\n실험\t2.8\t3.9\n통제\t3.1\t3.3\n…"}
          className="font-mono text-xs"
        />

        {data && (
          <>
            <p className="text-[11px] text-muted-foreground">
              <FileInput size={11} className="mr-1 inline" />
              {data.rowCount}행 × {data.headers.length}열 인식 — 변수:{" "}
              {data.headers.map((h, j) => `${h}(${data.isNumeric[j] ? "숫자" : "범주"})`).join(", ")}
            </p>

            <div className="flex flex-wrap gap-1">
              {(Object.keys(KIND_LABELS) as AnalysisKind[]).map((kd) => (
                <button
                  key={kd}
                  type="button"
                  onClick={() => {
                    setKind(kd);
                    setResult(null);
                  }}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] transition-colors",
                    kind === kd ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  {KIND_LABELS[kd]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
              {needsGroupDep && colSelect("집단", groupCol, setGroupCol, false)}
              {needsGroupDep && colSelect("종속", depCol, setDepCol, true)}
              {kind === "ancova" && colSelect("공변량", covCol, setCovCol, true)}
              {kind === "ttest_paired" && colSelect("사전", preCol, setPreCol, true)}
              {kind === "ttest_paired" && colSelect("사후", postCol, setPostCol, true)}
              {kind === "chisq" && colSelect("범주 1", groupCol, setGroupCol, false)}
              {kind === "chisq" && colSelect("범주 2", catCol2, setCatCol2, false)}
              {needsMulti && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-semibold">변수 선택</span>
                  {data.headers.map((h, j) =>
                    data.isNumeric[j] ? (
                      <button
                        key={j}
                        type="button"
                        onClick={() => toggleMulti(j)}
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px]",
                          multiCols.includes(j) ? "border-primary bg-primary/10 text-primary" : "bg-card",
                        )}
                      >
                        {h}
                      </button>
                    ) : null,
                  )}
                </div>
              )}
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={run}>
                <Calculator size={12} />
                분석 실행
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-2">
            <Textarea readOnly value={result} rows={12} className="font-mono text-[11px]" />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  void navigator.clipboard.writeText(result).then(
                    () => toast.success("분석 결과가 복사되었습니다."),
                    () => toast.error("복사에 실패했습니다."),
                  )
                }
              >
                <ClipboardCopy size={12} />
                복사
              </Button>
              {onInsertText && !readOnly && (
                <Button
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    onInsertText(result);
                    onOpenChange(false);
                  }}
                >
                  결과 장 &lsquo;가정 검정&rsquo; 섹션에 삽입
                </Button>
              )}
            </div>
          </div>
        )}

        {!data && raw.trim().length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
            <Loader2 size={11} />
            데이터를 인식하지 못했습니다 — 첫 행에 변수명, 둘째 행부터 값이 오도록 붙여넣으세요.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
