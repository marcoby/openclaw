# Marcoby Systems Architecture — Draft v0

Purpose
High-level view of how Pulse, Catalyst, and Nexus interact. Focus: data flows, events, and handoffs.

Mermaid (logical view)

```mermaid
flowchart LR
  subgraph Pulse[Pulse Marketplace]
    P1[Catalog/Products]
    P2[Orders]
    P3[Customers]
    P4[Recommender]
  end

  subgraph Catalyst[Managed IT]
    C1[PSA/Ticketing]
    C2[Monitoring/Analytics]
    C3[Automation Routines]
    C4[Client Assets]
  end

  subgraph Nexus[HQaaS Control Plane]
    N1[Identity & RBAC]
    N2[Tasks/Workflows]
    N3[Integrations/API]
    N4[Insights/Dashboards]
    N5[Event Bus]
  end

  P2 -- order.created --> N5
  N5 -- order->service map --> C1
  C1 -- ticket.status --> N4
  C2 -- metrics/events --> N5
  N2 -- runbooks --> C3
  N3 -- connectors --> P2
  N3 -- connectors --> C1
  N3 -- connectors --> C2

  subgraph DataStores[Shared]
    D1[(Customer/Account)]
    D2[(Assets/Entitlements)]
    D3[(Events/Telemetry)]
  end

  P3 <--> D1
  C4 <--> D2
  N5 <--> D3

  %% External
  U[Clients/Users] --> P2
  U --> Nexus
  Ops[Ops Team] --> Catalyst
```

Key Boundaries

- Pulse owns product/catalog, orders, and commerce UX
- Catalyst owns service delivery, SLAs, and client assets
- Nexus orchestrates identity, workflows, insights, and integrations

Security & Identity

- Central RBAC in Nexus; SCIM/SSO to Pulse/Catalyst
- Auditable event bus; least-privilege connectors

Next Steps

- Define canonical event schema (order.created, entitlement.provisioned, ticket.closed)
- Choose integration layer (webhooks + queue; e.g., SNS/SQS, Kafka, or Azure Service Bus)
- Map data contracts for D1/D2/D3
- Add error handling and retry policies
