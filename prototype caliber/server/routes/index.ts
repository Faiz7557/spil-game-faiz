// Every /api/* endpoint, keyed by its path under /api. Vercel Hobby caps a deployment at 12 functions, so
// they all ship inside one function (api/router.ts) instead of one file each.
import * as r0 from "./actions/index.js";
import * as r1 from "./actions/transition.js";
import * as r2 from "./admin/ai-quality.js";
import * as r3 from "./anomaly/explain.js";
import * as r4 from "./audit/rca.js";
import * as r5 from "./conflicts/decide.js";
import * as r6 from "./copilot.js";
import * as r7 from "./cron/due-actions.js";
import * as r8 from "./evidence/add.js";
import * as r9 from "./evidence/check.js";
import * as r10 from "./evidence/remove.js";
import * as r11 from "./evidence/upload-url.js";
import * as r12 from "./export/sap-pm.js";
import * as r13 from "./ingest/index.js";
import * as r14 from "./ingest/publish.js";
import * as r15 from "./ingest/upload-url.js";
import * as r16 from "./live.js";
import * as r17 from "./me.js";
import * as r18 from "./rca/draft.js";
import * as r19 from "./rca/review.js";
import * as r20 from "./snapshot.js";
import * as r21 from "./diagnosis/run.js";

type Handler = (req: Request) => Promise<Response>;
export const ROUTES: Record<string, { GET?: Handler; POST?: Handler }> = {
  "actions": r0,
  "actions/transition": r1,
  "admin/ai-quality": r2,
  "anomaly/explain": r3,
  "audit/rca": r4,
  "conflicts/decide": r5,
  "copilot": r6,
  "cron/due-actions": r7,
  "evidence/add": r8,
  "evidence/check": r9,
  "evidence/remove": r10,
  "evidence/upload-url": r11,
  "export/sap-pm": r12,
  "ingest": r13,
  "ingest/publish": r14,
  "ingest/upload-url": r15,
  "live": r16,
  "me": r17,
  "rca/draft": r18,
  "rca/review": r19,
  "snapshot": r20,
  "diagnosis/run": r21,
};
