# Public-index dork pack — passive stroll (clean)

For: Private Confidant / commercial + Fed-Treasury lateral discovery  
Rule: **published** conference, CLE, speech, proceeding, and gov/edu PDFs only.  
No auth hunting, no credential leaks, no open directories of secrets. If a hit looks private/misconfigured — skip.

Append to any query to cut junk:

```text
-inurl:login -inurl:signin -inurl:account -inurl:wp-admin -filetype:sql -"index of /" -password -credential
```

## Conference / speech / event

```text
"bill of exchange" OR "negotiable instruments" (conference OR symposium OR "annual meeting" OR keynote OR transcript) filetype:pdf

"UCC Article 3" OR "UCC Art. 3" (CLE OR "continuing legal education" OR workshop OR webinar) filetype:pdf

("commercial paper" OR "presentment" OR dishonor) (speech OR remarks OR "prepared statement" OR transcript) filetype:pdf

("Treasury Fiscal Service" OR "Bureau of the Fiscal Service" OR TFX) (conference OR summit OR "user group" OR webinar) filetype:pdf

("Federal Reserve" OR FedMail OR "check reclamation") (presentation OR slides OR "speaker notes") filetype:pdf OR filetype:pptx

"double-entry" OR Pacioli (lecture OR symposium OR "accounting history" OR conference) filetype:pdf
```

## Site-shaped (higher signal)

```text
site:.edu ("negotiable instruments" OR "UCC 3-104" OR "bills of exchange") (syllabus OR lecture OR slides) filetype:pdf

site:.gov ("check reclamation" OR "Notice of Direct Debit" OR "Treasury Offset") filetype:pdf

site:.org (ABA OR "American Bar" OR AICPA OR NACHA) ("commercial paper" OR "Article 3") filetype:pdf

site:frb.org OR site:federalreserve.gov (remarks OR speech OR transcript) ("payment system" OR "check collection") filetype:pdf

site:fiscal.treasury.gov (reclamation OR protest OR "Summary of Debt") filetype:pdf
```

## Lateral / stack-adjacent

```text
("acceptance by conduct" OR "Feezer" OR "bills of exchange") (law review OR symposium) filetype:pdf

("three theories of banking" OR "credit creation" OR "intermediation") (conference OR workshop OR "working paper") filetype:pdf

("remittance coupon" OR "remittance transfer") (UCC OR "Article 3" OR FASB) filetype:pdf

("notarial protest" OR "notice of dishonor") (CLE OR form OR checklist) filetype:pdf

("tripartite" drawer drawee payee) (UCC OR draft) filetype:pdf
```

## Serendipity

```text
"instruments that perform" OR BuildaBOE OR "Stratford Financial" (pdf OR presentation)

"Particularis de Computis" OR "de computis et scripturis" (lecture OR conference OR facsimile) filetype:pdf

intitle:"proceedings" ("commercial law" OR "negotiable instruments") filetype:pdf
```

## Fed/Treasury-only pack

```text
("Bureau of the Fiscal Service" OR "Fiscal Service" OR NPRC) (reclamation OR "direct debit") (presentation OR training OR handbook) filetype:pdf

"Gold Book" (Treasury OR Fiscal) (check OR reclamation) filetype:pdf

("Treasury Offset Program" OR TOP OR "Treasury Check Offset" OR TCO) (training OR FAQ OR presentation) filetype:pdf

site:frbservices.org (FedMail OR reclamation OR "service change") filetype:pdf
```

## Pacioli / bookkeeping-history pack

```text
Pacioli ("double entry" OR "double-entry") (conference OR lecture OR "accounting history") filetype:pdf

"Summa de arithmetica" OR "Particularis de computis et scripturis" filetype:pdf

("issuing creditor" OR "obligated debtor") (accounting OR ledger OR "bills of exchange") filetype:pdf
```

When a hit is worth keeping: drop into `~/Downloads/corpus/` with a note, then book-pipeline artifact or book-to-skill — band `settled|institutional|contested` before Pcon warm spine.
