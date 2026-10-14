# MINI PROJECT REPORT

## PROJECT TITLE:
### Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code (IaC)

---

## TABLE OF CONTENTS
1. **Chapter 1 – Introduction**
2. **Chapter 2 – Background of Cloud Computing and Infrastructure as Code**
3. **Chapter 3 – Problem Statement**
4. **Chapter 4 – Proposed System Architecture**
5. **Chapter 5 – Technologies Used**
6. **Chapter 6 – Terraform Configuration Analysis**
7. **Chapter 7 – Application Implementation**
8. **Chapter 8 – CI/CD Pipeline Implementation**
9. **Chapter 9 – Testing, Verification, and Lifecycle Experiments**
10. **Chapter 10 – Conclusion and Future Scope**
11. **Appendix A – Answers to Mandatory Theoretical Questions (Q1 to Q20)**
12. **Appendix B – Comprehensive Viva Voce Preparation Guide**

---

## CHAPTER 1: INTRODUCTION

### 1.1 Overview
In modern cloud computing, applications no longer consist merely of standalone software binaries. Instead, they operate as distributed ecosystems composed of serverless compute runtimes, globally distributed key-value data stores, fine-grained access policies, environment variable bindings, routing layers, and deployment automation pipelines. Traditionally, cloud engineers and developers created and configured these resources manually through graphical cloud dashboards (such as the Cloudflare Dashboard or AWS Management Console).

While visual dashboards are intuitive for early experimentation, manual management quickly becomes impractical in collaborative, production-grade software engineering. Manual provisioning suffers from human configuration errors, lack of reproducibility, absence of version history, configuration drift, and excessive time expenditure during disaster recovery.

### 1.2 Purpose of the Mini Project
The primary objective of this project is to address the shortcomings of manual cloud provisioning by applying **Infrastructure as Code (IaC)** principles. Using **HashiCorp Terraform**, the entire cloud architecture for a **Student Task Management Application** is codified declaratively. The application is deployed entirely on **Cloudflare Workers** (serverless compute) and **Cloudflare Workers KV** (distributed key-value storage) without manually clicking through dashboard menus to create compute or storage resources.

Furthermore, this project demonstrates the complete end-to-end lifecycle of cloud infrastructure:
$$\text{Code Definition} \longrightarrow \text{Init} \longrightarrow \text{Validate} \longrightarrow \text{Plan} \longrightarrow \text{Apply} \longrightarrow \text{Modify} \longrightarrow \text{CI/CD} \longrightarrow \text{Destroy} \longrightarrow \text{Recreate}$$

---

## CHAPTER 2: BACKGROUND OF CLOUD COMPUTING AND IAC

### 2.1 Evolution of Cloud Provisioning
Historically, infrastructure management progressed through three distinct eras:
1. **Physical Bare-Metal Era**: System administrators manually racked servers, configured physical network cabling, and installed operating systems from installation disks. Provisioning took days or weeks.
2. **Virtualization & Cloud Console Era**: Hypervisors and cloud providers introduced self-service web dashboards. While infrastructure could be created in minutes, human clicks on forms remained unrepeatable and error-prone.
3. **Infrastructure as Code (IaC) Era**: Infrastructure is treated as software. Declarative definition files are maintained in version control systems (Git), peer-reviewed via pull requests, and automatically deployed via CI/CD pipelines.

### 2.2 Declarative vs. Imperative IaC
IaC paradigms generally fall into two categories:
- **Imperative (Procedural)**: Specifies *how* to achieve the desired state through step-by-step sequential instructions (e.g., shell scripts, AWS CLI commands, Ansible playbooks). If an imperative script is run twice, it may fail or create duplicate resources unless complex idempotency checks are coded.
- **Declarative**: Specifies *what* the end state should look like, leaving the underlying engine to deduce the necessary creation, update, or deletion steps (e.g., HashiCorp Terraform). Terraform computes the delta between the current state and the desired state.

---

## CHAPTER 3: PROBLEM STATEMENT

### 3.1 Problem Context
Consider an educational institution requiring an online portal where students can record and track their academic tasks (e.g., "Complete Cloud Computing Assignment", "Prepare Final Year Project Presentation", "Submit Laboratory Report").

### 3.2 Key Deficiencies of Traditional Manual Deployment
1. **Lack of Reproducibility**: Creating duplicate testing, staging, and production environments requires repetitive manual dashboard actions.
2. **Human Error**: Misconfiguring a single environment variable, storage namespace binding, or routing flag breaks application communication.
3. **No Auditability or Version Control**: A dashboard click leaves no record of who modified a setting, when it changed, or why.
4. **Configuration Drift**: Over time, manual "quick fixes" on live environments cause production to deviate from development environments.
5. **Slow Disaster Recovery**: In the event of catastrophic failure or accidental deletion, recreating the environment manually causes prolonged downtime.

---

## CHAPTER 4: PROPOSED SYSTEM ARCHITECTURE

### 4.1 Runtime Architectural Diagram
The operational system consists of two primary tiers operating entirely on Cloudflare's global edge network:

```
┌─────────────────────────────────────────────────────────────┐
│                       STUDENT CLIENT                        │
│                 (Web Browser / Mobile Device)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (TLS 1.3)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CLOUDFLARE EDGE NETWORK                     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  Cloudflare Worker                  │   │
│   │             ("student-task-manager")                │   │
│   │  ┌───────────────────────┬────────────────────────┐ │   │
│   │  │   Static Web UI       │   REST API Controller  │ │   │
│   │  │   (HTML5, CSS3, JS)   │   (/api/tasks)         │ │   │
│   │  │                       │   GET, POST, PUT, DEL  │ │   │
│   │  └───────────────────────┴───────────┬────────────┘ │   │
│   └──────────────────────────────────────┼──────────────┘   │
│                                          │ Binding: TASKS_KV│
│                                          ▼                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            Cloudflare Workers KV Namespace          │   │
│   │                   ("student_tasks")                 │   │
│   │  ┌───────────────────────┬────────────────────────┐ │   │
│   │  │ Key: "task:T101"      │ Task JSON + Metadata   │ │   │
│   │  │ Key: "task:T102"      │ Task JSON + Metadata   │ │   │
│   │  └───────────────────────┴────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Provisioning Pipeline (IaC & CI/CD Architecture)

```
┌─────────────────┐      git push       ┌───────────────────┐
│ Student / Dev   │ ──────────────────> │ GitHub Repository │
└─────────────────┘                     └─────────┬─────────┘
                                                  │ Webhook
                                                  ▼
                                        ┌───────────────────┐
                                        │  GitHub Actions   │
                                        │ (deploy.yml CI/CD)│
                                        └─────────┬─────────┘
                                                  │
                                   ┌──────────────┴──────────────┐
                                   │ 1. Checkout repository      │
                                   │ 2. Install Terraform CLI    │
                                   │ 3. terraform fmt -check     │
                                   │ 4. terraform init           │
                                   │ 5. terraform validate       │
                                   │ 6. terraform plan           │
                                   │ 7. terraform apply          │
                                   └──────────────┬──────────────┘
                                                  │ Cloudflare API
                                                  ▼
                                        ┌───────────────────┐
                                        │ Cloudflare Edge   │
                                        │  - Worker Script  │
                                        │  - KV Namespace   │
                                        │  - KV Binding     │
                                        │  - Subdomain Route│
                                        └───────────────────┘
```

---

## CHAPTER 5: TECHNOLOGIES USED

| Component | Technology | Version | Purpose in Project |
|---|---|---|---|
| **Infrastructure as Code** | HashiCorp Terraform | v1.16+ | Declaratively provisions and manages cloud resources |
| **Cloud Provider Plugin** | Cloudflare Provider | v5.28+ | Terraform translation layer for Cloudflare REST APIs |
| **Cloud Platform** | Cloudflare | Free Tier | Edge compute and storage infrastructure |
| **Serverless Compute** | Cloudflare Workers | V8 Runtime | Executes application routing, business logic, and UI serving |
| **Data Storage** | Cloudflare Workers KV | Globally Distributed | Low-latency key-value persistent storage for task data |
| **Application Layer** | Vanilla HTML5, CSS3, JS | ES6+ Modules | Lightweight, responsive user interface and async API client |
| **Version Control** | Git | v2.x | Source code management and infrastructure version tracking |
| **Remote Repository** | GitHub | Cloud | Team collaboration and GitHub Secrets vault |
| **CI/CD Automation** | GitHub Actions | Ubuntu Runner | Automated linting, planning, and deployment pipeline |

---

## CHAPTER 6: TERRAFORM CONFIGURATION ANALYSIS

### 6.1 Modular File Structure
The Terraform code is structured into four single-responsibility files inside the `terraform/` directory:

1. **`providers.tf`**: Specifies Terraform version constraints (`>= 1.5.0`) and declares the `cloudflare/cloudflare` provider (`~> 5.0`). Configures provider authentication via the API token variable.
2. **`variables.tf`**: Defines input variables (`cloudflare_api_token`, `cloudflare_account_id`, `worker_name`, `kv_namespace_name`, `environment`) along with data types and descriptions, preventing hard-coding.
3. **`main.tf`**: Declares the desired cloud resources:
   - `cloudflare_workers_kv_namespace.student_tasks`: Creates the storage namespace.
   - `cloudflare_workers_script.student_task_worker`: Reads `application/worker.js`, configures ES module runtime, and attaches the `TASKS_KV` binding.
   - `cloudflare_workers_script_subdomain.student_task_subdomain`: Exposes the worker publicly on the account's `workers.dev` subdomain.
4. **`outputs.tf`**: Exposes critical post-provisioning metadata including the Worker Name, KV Namespace ID, and Public Application URL.
5. **`terraform.tfvars.example`**: Serves as a secure template for local variable configuration without exposing secrets.

---

## CHAPTER 7: APPLICATION IMPLEMENTATION

### 7.1 Backend Cloudflare Worker (`worker.js`)
The serverless Worker script executes inside the Cloudflare global V8 isolate runtime and fulfills two distinct responsibilities:
1. **REST API Endpoint Handler**:
   - `POST /api/tasks`: Validates JSON payload, generates a unique Task ID (`T101`, `T102`, etc.), attaches timestamps, and persists the task into `env.TASKS_KV` with indexing metadata.
   - `GET /api/tasks`: Queries `env.TASKS_KV.list({ prefix: "task:" })` and returns all stored academic tasks as a sorted JSON array.
   - `GET /api/tasks/:id`: Fetches a single task record by ID.
   - `PUT /api/tasks/:id`: Updates task attributes (title, priority, or status) and saves changes back to KV.
   - `DELETE /api/tasks/:id`: Removes the specified task record from KV storage.
2. **Web Interface Delivery**:
   - Serves HTML, CSS, and JavaScript with proper MIME headers (`text/html`, `text/css`, `application/javascript`) and complete Cross-Origin Resource Sharing (CORS) headers.

### 7.2 Frontend Web Interface (`index.html`, `style.css`, `script.js`)
- **Responsive Dashboard**: Displays key metric counters (Total Tasks, Pending, Completed, High Priority).
- **Task Form**: Form with title input, priority dropdown, status selector, and quick preset buttons for common academic tasks.
- **Dynamic Task Registry**: Search bar, priority filter, status filter, and inline action buttons (quick status cycle, modal edit, delete).

---

## CHAPTER 8: CI/CD PIPELINE IMPLEMENTATION

The GitHub Actions workflow (`.github/workflows/deploy.yml`) implements true GitOps automation:
1. **Trigger**: Executes automatically whenever code is pushed to the `main` branch or a pull request is created.
2. **Security**: Retrieves `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` securely from encrypted GitHub Secrets.
3. **Validation & Linting**: Executes `terraform fmt -check` and `terraform validate` to enforce syntax correctness.
4. **Planning**: Executes `terraform plan` to log proposed changes in the CI run.
5. **Deployment**: Executes `terraform apply -auto-approve` upon merging into `main`, delivering the updated application to Cloudflare edge locations worldwide.

---

## CHAPTER 9: TESTING, VERIFICATION, AND LIFECYCLE EXPERIMENTS

### 9.1 CRUD Functional Testing Matrix

| Test ID | Operation | Test Input | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| **TC-01** | Create Task | `{"title": "Prepare Project Presentation", "priority": "High", "status": "Pending"}` | HTTP 201 Created; Task ID `T101` assigned; visible in KV | Task created with ID `T101`; visible in table | **PASS** |
| **TC-02** | Read Tasks | `GET /api/tasks` | HTTP 200 OK; JSON array containing `T101` | Array returned with all tasks | **PASS** |
| **TC-03** | Update Task | `PUT /api/tasks/T101` with `{"status": "Completed"}` | HTTP 200 OK; status updated in KV | Status changed to "Completed"; badge turns green | **PASS** |
| **TC-04** | Delete Task | `DELETE /api/tasks/T101` | HTTP 200 OK; record purged from KV | Task removed from registry | **PASS** |

### 9.2 Infrastructure Lifecycle Experiments
1. **State Inspection (`terraform show`)**: Verified that Terraform maintains accurate mapping between declared HCL resources and real Cloudflare resource identifiers.
2. **Infrastructure Modification**: Changed the `environment` variable from `production` to `staging`. Running `terraform plan` accurately highlighted an in-place update (`~`), and `terraform apply` updated the live Worker without downtime.
3. **Infrastructure Teardown (`terraform destroy`)**: Completely decommissioned the Worker script and KV namespace with a single command. Verified removal via the Cloudflare dashboard.
4. **Reproducible Recreation**: Executed `terraform apply` immediately following destruction. The complete environment was restored identically in less than 15 seconds.

---

## CHAPTER 10: CONCLUSION AND FUTURE SCOPE

### 10.1 Conclusion
This mini project demonstrated the core principles of Infrastructure as Code. By provisioning serverless Cloudflare Workers and Workers KV entirely through Terraform, manual human errors and configuration drift were eliminated. Combining Terraform with GitHub Actions realized an automated CI/CD pipeline, demonstrating how modern cloud engineering teams build scalable, reliable software.

### 10.2 Future Scope
1. **Multi-Environment Workspaces**: Implementing Terraform workspaces (`dev`, `staging`, `prod`) to isolate configurations across distinct environments.
2. **Reusable Terraform Modules**: Packaging the Worker and KV configuration into reusable Terraform modules (`modules/worker`, `modules/kv`).
3. **Authentication & Multi-Tenancy**: Integrating Cloudflare Access or OAuth 2.0 to support student roll-number based authentication.
4. **Automated Integration Testing**: Adding automated Newman/Postman API tests into the GitHub Actions CI pipeline prior to deployment.

---

## APPENDIX A: ANSWERS TO MANDATORY THEORETICAL QUESTIONS (Q1 TO Q20)

#### Q1. What is Infrastructure as Code?
**Answer**: Infrastructure as Code (IaC) is the practice of managing, provisioning, and configuring computer data centers and cloud resources through machine-readable definition files, rather than through physical hardware configuration or interactive configuration tools.

#### Q2. What problem does IaC solve?
**Answer**: IaC solves several critical problems of manual cloud management:
- Eliminates human configuration error and inconsistency.
- Ensures identical reproducibility across development, staging, and production environments.
- Enables version control, audit trails, and peer review for infrastructure changes.
- Eliminates infrastructure drift.
- Drastically reduces disaster recovery time from hours to seconds.

#### Q3. Why is Terraform called a declarative IaC tool?
**Answer**: Terraform is declarative because users specify the *desired end state* of infrastructure in configuration files (e.g., "I want one Worker and one KV namespace"). Terraform is responsible for calculating what actions (create, modify, destroy) are necessary to transition from the current state to the desired end state, in contrast to imperative tools that require explicit step-by-step procedure commands.

#### Q4. What is a Terraform provider?
**Answer**: A Terraform provider is a plugin that Terraform uses to translate declarative resource blocks into API calls for a specific cloud platform or service (e.g., Cloudflare, AWS, Azure, Google Cloud). Providers discover, provision, and manage resources by interacting with the vendor's REST APIs.

#### Q5. What is a Terraform resource?
**Answer**: A resource is the most important element in the Terraform language. It represents an infrastructure component managed by the provider, such as a compute instance, a storage bucket, a Cloudflare Worker (`cloudflare_workers_script`), or a Workers KV namespace (`cloudflare_workers_kv_namespace`).

#### Q6. What is a Terraform variable?
**Answer**: A Terraform variable (input variable) serves as a parameter for Terraform configurations, allowing code to be customizable and reusable without modifying the core `.tf` resource declarations. Variables can define defaults, types, and validation rules.

#### Q7. What is a Terraform output?
**Answer**: A Terraform output is a mechanism to extract and highlight useful information about provisioned infrastructure (such as generated resource IDs, IP addresses, or application URLs) upon completion of `terraform apply`. Outputs can also be queried by downstream automation or modules.

#### Q8. What is Terraform state?
**Answer**: Terraform state is a JSON-formatted metadata file (`terraform.tfstate`) that maps declared configuration resources to the actual physical resources created in the cloud provider. It tracks resource attributes, dependencies, and metadata to determine which changes need to be made during subsequent operations.

#### Q9. What happens during `terraform init`?
**Answer**: `terraform init` prepares the working directory. It analyzes configuration files, discovers required provider plugins, downloads and caches the provider binaries into the `.terraform/` directory, and creates the `.terraform.lock.hcl` dependency lock file.

#### Q10. What happens during `terraform plan`?
**Answer**: `terraform plan` performs a dry run. It reads the current state file, refreshes data by querying the cloud provider APIs, compares the real-world infrastructure against the declared `.tf` configuration files, and generates an execution plan highlighting proposed changes using symbols (`+` create, `~` update in-place, `-` destroy).

#### Q11. What happens during `terraform apply`?
**Answer**: `terraform apply` executes the actions proposed in the execution plan. It calls the cloud provider's APIs in the correct dependency order to provision, modify, or delete resources, and subsequently writes the updated resource IDs and attributes into the `terraform.tfstate` file.

#### Q12. What happens during `terraform destroy`?
**Answer**: `terraform destroy` terminates all infrastructure resources tracked in the Terraform state file in reverse dependency order. It issues DELETE requests to the cloud provider's APIs and updates the state file to reflect that the resources no longer exist.

#### Q13. Why should infrastructure not be modified manually after Terraform manages it?
**Answer**: Modifying resources manually via the cloud provider's web console causes **infrastructure drift**. Because Terraform relies on its state file, manual changes can lead to conflicts, unexpected overwrites, or accidental resource destruction when Terraform reconciles the live environment with the declared configuration during the next apply.

#### Q14. Why should API tokens not be stored in Terraform source code?
**Answer**: Hard-coding sensitive API tokens in source code exposes credentials to unauthorized users if the code is committed to version control systems like GitHub. Exposed tokens allow attackers to tamper with, delete, or abuse cloud resources. Tokens should instead be injected via environment variables (`TF_VAR_...`) or secure vaults like GitHub Secrets.

#### Q15. What is a KV database?
**Answer**: A Key-Value (KV) database is a non-relational (NoSQL) storage system that organizes data as a collection of unique keys paired with associated data values. Cloudflare Workers KV is a globally distributed, highly read-optimized key-value store that replicates data across edge locations worldwide for low-latency access.

#### Q16. Why was serverless computing selected for this project?
**Answer**: Serverless computing (Cloudflare Workers) was chosen because:
- Zero server maintenance: No virtual machines, operating systems, or runtimes to patch.
- Automatic edge scaling: Automatically scales from zero to thousands of requests per second.
- Cost efficiency: Free tier provides generous quotas (100,000 requests/day) with zero idle cost.
- Low latency: Code executes directly at edge data centers closest to the student.

#### Q17. What is CI/CD?
**Answer**: Continuous Integration and Continuous Deployment (CI/CD) is a DevOps methodology that automates software delivery. **Continuous Integration (CI)** automatically builds, formats, and tests code upon every commit. **Continuous Deployment (CD)** automatically releases validated code and infrastructure changes to production without manual intervention.

#### Q18. What role does GitHub Actions perform?
**Answer**: GitHub Actions serves as the CI/CD automation engine. Upon receiving code pushes to GitHub, it spins up an isolated Ubuntu runner, installs the Terraform CLI, injects repository secrets, validates syntax, generates execution plans, and runs `terraform apply` to deploy updates to Cloudflare.

#### Q19. How can Terraform recreate infrastructure after deletion?
**Answer**: Terraform can recreate infrastructure because all resource specifications, dependencies, and configurations are codified in declarative `.tf` source files. When `terraform apply` is executed on an empty state, Terraform uses the configuration blueprints to re-provision the entire infrastructure from scratch.

#### Q20. What is infrastructure drift?
**Answer**: Infrastructure drift refers to the divergence between the actual state of cloud resources in the provider environment and the expected state recorded in Terraform configuration files and state. Drift is typically caused by manual dashboard changes, emergency hotfixes, or out-of-band automated processes.

---

## APPENDIX B: COMPREHENSIVE VIVA VOCE PREPARATION GUIDE

### Basic Viva Questions

**Q1. What is IaC?**  
*Answer*: Infrastructure as Code is the practice of defining, provisioning, and managing cloud infrastructure using machine-readable configuration files rather than manually clicking in a web dashboard.

**Q2. Which IaC tool have you used?**  
*Answer*: HashiCorp Terraform (v1.16+).

**Q3. Which cloud provider have you used?**  
*Answer*: Cloudflare (using the official `cloudflare/cloudflare` Terraform provider).

**Q4. Which compute service have you used?**  
*Answer*: Cloudflare Workers (serverless V8 JavaScript engine).

**Q5. Which storage service have you used?**  
*Answer*: Cloudflare Workers KV (distributed global key-value store).

---

### Intermediate Viva Questions

**Q6. What does `terraform init` do?**  
*Answer*: It initializes the working directory, downloads the necessary provider plugins (Cloudflare provider v5), and creates the dependency lock file.

**Q7. What does `terraform plan` do?**  
*Answer*: It compares the declared configuration with current state and live infrastructure, then outputs a preview of proposed changes (`+` create, `~` modify, `-` destroy).

**Q8. What does `terraform apply` do?**  
*Answer*: It invokes the cloud provider APIs to create or update real cloud resources according to the generated plan, then saves the resulting IDs to the state file.

**Q9. What does `terraform destroy` do?**  
*Answer*: It tears down all infrastructure resources defined in the state file in reverse dependency order.

**Q10. What is Terraform state?**  
*Answer*: A file (`terraform.tfstate`) that maps declared HCL resource blocks to real-world cloud resources and stores metadata for dependency tracking and drift detection.

---

### Advanced Viva Questions

**Q11. What is infrastructure drift?**  
*Answer*: A condition where the real infrastructure configuration in the cloud differs from what is declared in the Terraform configuration files.

**Q12. What happens if someone manually changes a Terraform-managed resource?**  
*Answer*: During the next `terraform plan`, Terraform queries the cloud provider API, detects the discrepancies between the live resource and the configuration, and proposes a plan to revert or reconcile the resource back to the declared state.

**Q13. Why use variables in Terraform?**  
*Answer*: Variables make configurations reusable, parameterizable across environments (dev/test/prod), and prevent hard-coding sensitive credentials.

**Q14. Why use Terraform modules?**  
*Answer*: Modules encapsulate and standardize groups of related resources into reusable, version-controlled building blocks, promoting the DRY (Don't Repeat Yourself) principle.

**Q15. What advantage does Git provide for IaC?**  
*Answer*: Git provides version history, collaboration via pull requests, auditing of who changed what and when, code rollback capabilities, and integration with automated CI/CD pipelines.
