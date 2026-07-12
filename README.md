# CERBERUS XAI

A unified single-page presentation of **CERBERUS: Runtime Independence Budgeting for Layered Assurance in Autonomous Systems**.

This repository transfers the complete `cerberus-pages` research interface and preserves its standalone modules while making all four major surfaces visible on one front page:

- Independence Observatory
- Incident Theatre
- Assurance Workbench
- Flight Reference Kernel

The original front page is retained as [`observatory.html`](observatory.html), and the original repository guide is retained as [`CERBERUS_PAGES_README.md`](CERBERUS_PAGES_README.md).

## What remains intact

The transfer preserves the browser simulations, scenario suite, evidence workbench, Web Worker capability topology, C11 authority kernel, unit tests, deterministic 250,000-transition property campaign, CBMC harness, specifications, documentation, and supporting source files.

## Unified deployment

The repository root is the single-page interface. Its four embedded same-origin modules remain fully interactive, while the standalone HTML files remain available for direct inspection and debugging. The Pages workflow validates every embedded route before upload.

## Local use

Serve the repository so Web Workers and embedded same-origin modules load correctly:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

Build and test the C reference kernel with:

```bash
cd flight-reference
make all
make test
make demo
```

## Evidence boundary

This is a research communication and reference-code repository. It is not flight software, certification evidence, an operational detector, or a completed safety case. The executable C kernel establishes only its declared software properties under its stated inputs and assumptions.

Copyright © 2026 Emily Echterhoff. All rights reserved.
