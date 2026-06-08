# NVIDIA: Company Deep Dive

> NVDA · NASDAQ · Semiconductors / Accelerated Computing · Santa Clara, CA · FY ends late January

## Executive Summary

NVIDIA reported **$215.9B** in revenue in FY2026 (ended January 25, 2026), up **65%** year-over-year, with net income of **$120.1B** [1]. Revenue has grown roughly **8x in three years** — from $27.0B in FY2023 — as the data-center AI build-out turned its GPUs into the default compute layer for training and inference [1]. Gross margin sits above 70% and the company employs about **42,000** people, up 16.7% in a year [1]. NVIDIA's moat is full-stack: GPUs, the CUDA software ecosystem, high-speed networking, and reference systems competitors cannot easily assemble [2]. The current expansion targets sovereign AI, enterprise inference, and AI-driven biology through the BioNeMo and Clara platforms [2][3].

## Company Overview

NVIDIA Corporation designs accelerated-computing platforms: data-center GPUs, networking, the CUDA programming model, and AI software [1]. Founded in 1993 and headquartered in Santa Clara, California, it has traded on NASDAQ as NVDA since its 1999 IPO [1]. Its FY2026 Form 10-K reports $215.9B in revenue and ~42,000 full-time employees, up from 36,000 a year earlier [1]. The business has shifted decisively from gaming toward the data center, which now drives the overwhelming majority of revenue and profit [1].

## Strategic Direction

### Data-Center Compute Platform

NVIDIA's core engine is the data center: successive architectures (Hopper, Blackwell, and the announced Vera Rubin) paired with NVLink and InfiniBand/Ethernet networking [2]. The company sells systems, not just chips — racks, interconnect, and software — which raises switching costs and average selling prices [2].

- CUDA's developer ecosystem is the durable software moat.
- Networking (acquired via Mellanox) lets NVIDIA sell full clusters.

### Sovereign and Enterprise AI

NVIDIA is positioning national governments and large enterprises as new buyer classes ("sovereign AI"), extending demand beyond the U.S. hyperscalers [2].

### AI-Driven Biology

BioNeMo is an open platform for lab-in-the-loop AI biology, adopted by Chai Discovery, Basecamp Research, and Boltz, and aimed at the industry's ~$300B/year R&D cost problem [3]. The Clara family spans omics, protein and molecular structure, medical imaging, and surgical robotics [3].

## Business Model & Financial Performance

NVIDIA sells high-margin accelerated-computing platforms. The mix shift to data center has lifted gross margin into the low-to-mid 70s and produced extreme operating leverage [1].

**Revenue Trajectory**

| Fiscal Year | Revenue | YoY Growth |
|---|---|---|
| FY2022 | $26.9B | — |
| FY2023 | $27.0B | +0.4% |
| FY2024 | $60.9B | +125.9% |
| FY2025 | $130.5B | +114.2% |
| FY2026 | $215.9B | +65.3% |

Source: NVIDIA Form 10-K filings, SEC EDGAR [1].

```chart
{"type":"line","title":"Revenue by Fiscal Year ($B)","x":["FY22","FY23","FY24","FY25","FY26"],"series":[{"name":"Revenue","values":[26.9,27.0,60.9,130.5,215.9],"color":"#76b900"}]}
```

```chart
{"type":"bar","title":"Revenue vs Net Income ($B)","x":["FY22","FY23","FY24","FY25","FY26"],"series":[{"name":"Revenue","values":[26.9,27.0,60.9,130.5,215.9],"color":"#76b900"},{"name":"Net Income","values":[9.8,4.4,29.8,72.9,120.1],"color":"#10b981"}]}
```

**FY2026 Profitability** [1]

| Metric | Value |
|---|---|
| Net income | $120.1B |
| Gross margin | ~71% |
| Operating income | $130.4B |
| R&D spend | $18.5B |

## Recent Strategic Partnerships

**Eli Lilly + NVIDIA** — A co-innovation AI lab investing up to **$1 billion** over five years, built on BioNeMo and the Vera Rubin architecture to reinvent drug discovery [3].

**BioNeMo ecosystem** — Adoption by Chai Discovery, Basecamp Research, and Boltz extends NVIDIA's platform into computational biology [3].

## Investment & Acquisition Activity

| Focus | Type | Strategic Rationale |
|---|---|---|
| Networking (Mellanox legacy) | Platform | Sell full clusters, not just GPUs [2] |
| AI biology (BioNeMo / Clara) | Platform R&D | Open new life-sciences compute demand [3] |
| Eli Lilly co-innovation lab | Partnership ($1B) | Anchor pharma as a long-term GPU buyer [3] |

## Hiring & Workforce Signals

Headcount rose ~16.7% to ~42,000 in a single fiscal year, tracking the data-center ramp [1]. Hiring concentrates in systems and silicon engineering, AI software (CUDA, libraries), and vertical platforms such as healthcare and robotics [1][3].

## Competitive Positioning

### Advantages

- **CUDA lock-in** — A two-decade software ecosystem that rivals must reproduce to compete [2].
- **Full-stack systems** — GPUs plus networking plus software, sold as integrated clusters [2].
- **Margin and scale** — >70% gross margin funds an R&D lead competitors struggle to match [1].

### Threats

- AMD's accelerator line and hyperscaler custom silicon (Google TPU, Amazon Trainium, Microsoft Maia) target NVIDIA's most profitable customers [2].
- U.S. export controls restrict sales of advanced GPUs to China [1].
- Demand is concentrated in a handful of hyperscalers, raising digestion risk if AI capex slows [1].

### Market Share

NVIDIA holds the dominant share of data-center AI accelerators, with most large training clusters built on its platform [2].

## Key Risks

**Customer concentration** — A small number of hyperscalers drive a large share of revenue; any pause in their capex would hit results quickly [1].

**Export controls** — China restrictions cap a large addressable market and can change with policy [1].

**Custom silicon** — Cloud providers designing their own chips could erode NVIDIA's share of inference workloads over time [2].

**Cyclicality** — The current build-out is steep; a shift from buildout to digestion could compress growth and margins [1].

## Outlook

NVIDIA is the prime beneficiary of the AI compute build-out, with revenue up ~8x in three years and operating income of $130.4B in FY2026 [1]. The bull case rests on inference demand and sovereign AI broadening the buyer base beyond U.S. hyperscalers [2]. The bear case is concentration and custom silicon. There is no exit question — NVIDIA is among the most valuable companies in the world; the metrics to watch are data-center revenue growth, gross margin, China policy, and the Blackwell-to-Rubin transition [1][2].

## Sources

[1] NVIDIA Corporation — Form 10-K (FY2026, ended January 25, 2026), U.S. SEC EDGAR. sec.gov
[2] Industry analysis — accelerated computing, CUDA, and AI infrastructure competition (2025–2026).
[3] NVIDIA Newsroom — BioNeMo platform adoption and the NVIDIA–Eli Lilly co-innovation lab. nvidianews.nvidia.com
