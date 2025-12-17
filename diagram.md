```mermaid
sequenceDiagram
    participant Client
    participant Server as Server (SvelteKit)
    participant DB as Database
    participant SQS as AWS SQS
    participant Lambda as AWS Lambda (TSP Solver)

        %% 1. Client initiates optimization
        Client->>Server: POST /api/maps/[mapId]/optimize
        Server->>DB: Create optimization job (status: pending)
        Server->>SQS: SendMessage (job_id, matrix, stops, vehicles, config)
        Server-->>Client: 200 OK (job created)

        %% 2. Client polls for status
        loop Poll every 2s
            Client->>Server: GET /api/maps/[mapId]/optimize
            Server->>DB: Query active job status
            Server-->>Client: { job: { status: "pending" | "running" } }
        end

        %% 3. Lambda processes
        SQS->>Lambda: Trigger (message)
        Lambda->>Lambda: Solve TSP optimization

        alt Success
            Lambda->>Server: POST /api/webhooks/optimization (success, job_id, result)
            Server->>DB: Update job (status: completing)
            Server->>Server: Apply routes, compute directions
            Server->>DB: Update job (status: completed)
            Server-->>Lambda: 200 OK
        else Failure
            Lambda->>Server: POST /api/webhooks/optimization (success: false, error_message)
            Server->>DB: Update job (status: failed, error_message)
            Server-->>Lambda: 200 OK
        end

        %% 4. Client receives result
        Client->>Server: GET /api/maps/[mapId]/optimize
        Server->>DB: Query job status
        Server-->>Client: { job: { status: "completed" } }
        Client->>Client: invalidateAll() - refresh page data


```

Flow Summary:

| Step | From   | To     | Action                     |
| ---- | ------ | ------ | -------------------------- |
| 1    | Client | Server | Request optimization       |
| 2    | Server | DB     | Create job (pending)       |
| 3    | Server | SQS    | Queue optimization payload |
| 4    | Client | Server | Poll for status (every 2s) |
| 5    | SQS    | Lambda | Trigger solver             |
| 6    | Lambda | Lambda | Run OR-Tools TSP solver    |
| 7    | Lambda | Server | Webhook with result        |
| 8    | Server | DB     | Update job + apply routes  |
| 9    | Client | Server | Poll detects completion    |
| 10   | Client | Client | Refresh UI with new routes |
