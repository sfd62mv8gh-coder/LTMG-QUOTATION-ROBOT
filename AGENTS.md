# AGENTS.md

## Project Identity

- Project name: **LTMG Quotation Tool**.
- Project purpose: This is an internal quotation tool for foreign trade sales of construction machinery and logistics/material-handling equipment.
- Product scope includes forklifts, diesel forklifts, electric forklifts, LPG forklifts, rough-terrain forklifts, reach trucks, loaders, excavators, aerial work platforms, telehandlers, warehouse equipment, and related machinery.

## Core Business Goals

1. Improve quotation efficiency.
2. Reduce mistakes in pricing, configurations, options, margins, ports, and quantity calculations.
3. Generate customer-readable quotation text in English, Spanish, and Portuguese.
4. Allow future expansion into tools for PI generation, configuration sheets, container-loading plans, and after-sales spare-parts lists.

## Long-Term Business Rules

1. The default brand is **LTMG**.
2. The official seller company name for formal documents is **Xiamen Ltmg Co., Ltd.**
3. The default quotation markup is **+300 USD per unit**, unless the user specifies another margin rule.
4. Large-tonnage forklifts may use a **1% profit rule**, but only when the user explicitly requests it.
5. Lithium-battery equipment must show a separate reminder that there may be a **USD 800 / container dangerous-goods export or handling fee**. Do not include this fee in the unit price by default.
6. In customer-visible quotation text, emission standards must be written as **Stage II / Stage III / Stage IV / Stage V**. Do not write **China II / China III / China IV** in customer-facing text.
7. Do not expose internal exchange rates, internal base costs, supplier names, or supplier information in customer-facing quotation text.
8. Quotations must clearly display:
   - Product name
   - Model
   - Standard configuration
   - Included options
   - FOB port
   - Quantity
   - Unit price
   - Total price
9. Options must support choosing whether each option is included in the final price.
10. Price calculations must be transparent on the page and show:
    - Base FOB price
    - Options total
    - Markup
    - Final FOB unit price
    - Quantity
    - Total FOB amount
11. Do not store real customer private information.
12. Do not add login, payment, or external API integrations by default.
13. The user interface may be Chinese, but code variables, file names, and function names should preferably be English.
14. After adding any new feature, update the README with instructions for running the project on a Windows computer.
15. After every modification, run tests. If automated tests do not exist, provide manual testing steps at minimum.

## Development Requirements

1. Keep the tool simple and suitable for non-programmers.
2. Prefer a web interface. Do not build only a command-line tool unless explicitly requested.
3. Avoid overly complex frameworks.
4. If the repository is empty, the project may be created from scratch.
5. All calculation logic must include clear comments.
6. Before writing production code for a new feature, first provide the proposed file structure and implementation plan to the user.

## Agent Workflow Rules

- Follow this file for every future change in this repository.
- Preserve customer-facing clarity and protect internal business data.
- Keep implementation choices practical for an internal sales team.
- When adding or changing functionality, cite the affected files in the final response and include the tests or manual checks performed.
