# effect-todo

A repository to test out the functionalities and design patterns of [@EffectTS](https://effect.website)

Techniques explored
- Dynamic Configurations
- Multiple database connections
- CQRS
- Open Telemetry logging

# Get Started

1. Install dependencies
```bash
bun install
```

2. Bring services up
```bash
bun up
bun dev
```

3. Test the API
Use Bruno, and open the requests under [bruno-api-requests](./bruno-api-requests/) 

4. Observe the services
Navigate to [localhost:3000](http://localhost:3000) to bring up the Open Telemetry page. After sending some requests, they should show up in Tempo