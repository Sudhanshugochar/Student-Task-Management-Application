# Automated Deployment of a Serverless Student Task Management Application Using Terraform

[![Infrastructure as Code: Terraform](https://img.shields.io/badge/IaC-Terraform_v1.16+-623CE4?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Cloud: Cloudflare](https://img.shields.io/badge/Cloud-Cloudflare_Serverless-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![Compute: Cloudflare Workers](https://img.shields.io/badge/Compute-Cloudflare_Workers-EA580C)](https://workers.cloudflare.com/)
[![Storage: Workers KV](https://img.shields.io/badge/Storage-Cloudflare_Workers_KV-15803D)](https://developers.cloudflare.com/kv/)
[![CI/CD: GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)

---

## 1. Project Overview & Problem Statement

Modern cloud applications require multiple infrastructure components such as compute services, storage, application configuration, environment variables, networking, and deployment settings. Traditionally, these resources are created manually using a cloud provider's graphical dashboard.

### Problems with Manual Configuration:
- **Non-reproducible**: Hard to recreate identical environments for dev, test, and production.
- **Human error prone**: Easy to miss a configuration toggle, binding, or permission.
- **No audit trail / version history**: Changes in a web dashboard are not tracked.
- **Slow disaster recovery**: Rebuilding destroyed resources requires manual clicking.
- **Configuration drift**: Environments diverge over time.

### The Infrastructure as Code (IaC) Solution:
**Infrastructure as Code (IaC)** defines and provisions cloud infrastructure through declarative source code files. With Terraform:
- The entire topology is committed to Git.
- Environments can be spun up, modified, torn down, and faithfully reproduced in seconds.
- Changes are planned and validated before execution.

---

## 2. Proposed System Architecture

```text
STUDENT / EXAMINER
       │
       ▼
  Web Browser (HTTPS)
       │
       ▼
┌────────────────────────────────────────────────────────┐
│                   CLOUDFLARE EDGE                      │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │               Cloudflare Worker                │   │
│   │             (student-task-manager)             │   │
│   │  ┌──────────────────────┬────────────────────┐ │   │
│   │  │  Web Interface (UI)  │   REST API (/api)  │ │   │
│   │  │  (HTML, CSS, JS)     │ (GET, POST, PUT,   │ │   │
│   │  │                      │  DELETE)           │ │   │
│   │  └──────────────────────┴─────────┬──────────┘ │   │
│   └───────────────────────────────────┼────────────┘   │
│                                       │ (Binding: TASKS_KV)
│                                       ▼                │
│   ┌────────────────────────────────────────────────┐   │
│   │          Cloudflare Workers KV Namespace       │   │
│   │                 (student_tasks)                │   │
│   │  ┌──────────────┬────────────────────────────┐ │   │
│   │  │ Key: task:ID │ Value: Task JSON + Metadata│ │   │
│   │  └──────────────┴────────────────────────────┘ │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Automated IaC & CI/CD Pipeline Architecture:

```text
Student Developer
       │
       │ git push
       ▼
GitHub Repository
       │
       ▼ (Webhook trigger)
GitHub Actions Workflow (.github/workflows/deploy.yml)
       │
       ├── 1. Checkout Code
       ├── 2. Setup Terraform CLI
       ├── 3. terraform fmt -check
       ├── 4. terraform init
       ├── 5. terraform validate
       ├── 6. terraform plan
       └── 7. terraform apply
               │
               ▼
     Cloudflare Terraform Provider (v5.x)
               │
        ┌──────┴──────────────────────┐
        ▼                             ▼
Cloudflare Worker            Workers KV Namespace
(student-task-manager)         (student_tasks)
```

---

## 3. Project Directory Structure

```text
student-task-manager-iac/
├── terraform/
│   ├── providers.tf              # Cloudflare provider specification and version constraint
│   ├── main.tf                   # Core IaC resources: KV namespace, Worker, and Subdomain
│   ├── variables.tf              # Input variables (account ID, API token, names, env)
│   ├── outputs.tf                # Outputs: Worker name, KV namespace ID, application URL
│   └── terraform.tfvars.example  # Example credentials template
│
├── application/
│   ├── worker.js                 # Cloudflare Worker code (REST API + KV CRUD + UI serving)
│   ├── index.html                # Modern academic Task Management web interface
│   ├── style.css                 # Clean stylesheet with responsive design and badges
│   └── script.js                 # Client-side JavaScript (fetch, search, filter, modals)
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD automated pipeline for GitHub Actions
│
├── screenshots/
│   └── README.md                 # Complete checklist of required evaluation screenshots
│
├── .gitignore                    # Protects secrets (*.tfvars, *.tfstate, .terraform/)
├── PROJECT_REPORT.md             # Complete 10-chapter academic project report + Viva Q&A
└── README.md                     # Comprehensive project guide and instructions
```

---

## 4. What You Need from Cloudflare (Credentials Guide)

To deploy this project to your Cloudflare account, you only need **two items** from Cloudflare (both are free):

### Item 1: Cloudflare Account ID
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Click on **Workers & Pages** in the left sidebar.
3. On the right side of the screen, look for the **Account ID** box.
4. Click to copy your 32-character hexadecimal Account ID (e.g. `a1b2c3d4e5f67890abcdef1234567890`).

### Item 2: Cloudflare API Token
1. In the Cloudflare Dashboard, click your profile icon in the top right corner and select **My Profile**.
2. Click **API Tokens** in the left menu, then click **Create Token**.
3. Scroll to the bottom and click **Create Custom Token** -> **Get Started**.
4. Configure the token:
   - **Token name**: `student-task-manager-terraform`
   - **Permissions**:
     - `Account` | `Workers Scripts` | `Edit`
     - `Account` | `Workers KV Storage` | `Edit`
     - `Account` | `Account Settings` | `Read`
     - `Account` | `Workers Subdomain` | `Read` (or `Edit`)
   - **Account Resources**:
     - `Include` | `All accounts` (or select your specific account)
5. Click **Continue to summary**, then click **Create Token**.
6. **Copy the API token immediately** and save it securely. (Cloudflare does not show it again).

---

## 5. Step-by-Step Local Execution Guide

### Step 5.1: Verify Prerequisites
Open PowerShell or your terminal and confirm the tools are installed:
```powershell
terraform --version
# Expected: Terraform v1.16.x

git --version
# Expected: git version 2.x.x
```

### Step 5.2: Navigate to the Terraform Folder
```powershell
cd "student-task-manager-iac/terraform"
```

### Step 5.3: Supply Your Credentials
Copy the example variables file:
```powershell
cp terraform.tfvars.example terraform.tfvars
```
Open `terraform.tfvars` in your editor and enter your real values:
```hcl
cloudflare_api_token  = "YOUR_ACTUAL_CLOUDFLARE_API_TOKEN"
cloudflare_account_id = "YOUR_ACTUAL_CLOUDFLARE_ACCOUNT_ID"

worker_name       = "student-task-manager"
kv_namespace_name = "student_tasks"
environment       = "production"
```

### Step 5.4: Initialize Terraform
Downloads the Cloudflare provider plugin:
```powershell
terraform init
```
*Expected Output:*
```text
Terraform has been successfully initialized!
```

### Step 5.5: Format and Validate Code
```powershell
terraform fmt
terraform validate
```
*Expected Output:*
```text
Success! The configuration is valid.
```

### Step 5.6: Generate Execution Plan
```powershell
terraform plan
```
*Observe the plan output:*
- `+ resource "cloudflare_workers_kv_namespace" "student_tasks"` (Create)
- `+ resource "cloudflare_workers_script" "student_task_worker"` (Create)
- `+ resource "cloudflare_workers_script_subdomain" "student_task_subdomain"` (Create)
- Plan: **3 to add, 0 to change, 0 to destroy.**

### Step 5.7: Provision Infrastructure
```powershell
terraform apply
```
When prompted, type:
```text
yes
```
*Expected Output:*
```text
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:
application_url    = "https://student-task-manager.<your-subdomain>.workers.dev"
environment        = "production"
kv_namespace_id    = "7f8a9b..."
kv_namespace_title = "student_tasks"
worker_name        = "student-task-manager"
```

---

## 6. Testing the Application & CRUD Operations

Open the `application_url` in any browser or test via cURL:

### Test Case 1: Create Task (POST /api/tasks)
**Input JSON:**
```bash
curl -X POST https://student-task-manager.<your-subdomain>.workers.dev/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"id": "T101", "title": "Submit Final Year Project Report", "priority": "High", "status": "Pending"}'
```
*Expected Result:* HTTP 201 Created with JSON task object.

### Test Case 2: Read All Tasks (GET /api/tasks)
```bash
curl https://student-task-manager.<your-subdomain>.workers.dev/api/tasks
```
*Expected Result:* Returns JSON array including task `T101`.

### Test Case 3: Update Task (PUT /api/tasks/T101)
```bash
curl -X PUT https://student-task-manager.<your-subdomain>.workers.dev/api/tasks/T101 \
  -H "Content-Type: application/json" \
  -d '{"status": "Completed"}'
```
*Expected Result:* Returns updated task with `status: "Completed"`.

### Test Case 4: Delete Task (DELETE /api/tasks/T101)
```bash
curl -X DELETE https://student-task-manager.<your-subdomain>.workers.dev/api/tasks/T101
```
*Expected Result:* Returns HTTP 200 confirming deletion.

---

## 7. Mandatory IaC Demonstration Experiments

### Experiment 1: Inspect Terraform State (STEP 20)
```powershell
terraform show
```
Displays all provisioned resources tracked in `terraform.tfstate`.

### Experiment 2: Infrastructure Modification (STEP 21)
Modify a variable in `terraform.tfvars`:
```hcl
environment = "staging"
```
Or change `worker_name = "student-task-manager-v2"`.
Run plan to detect drift / changes:
```powershell
terraform plan
```
Notice Terraform proposes an in-place update (`~`) or replacement. Apply the change:
```powershell
terraform apply -auto-approve
```

### Experiment 3: Destroy Infrastructure (STEP 27 & 28)
Demonstrate complete teardown of cloud resources:
```powershell
terraform plan -destroy
terraform destroy
```
Type `yes` when prompted.
*Expected Output:*
```text
Destroy complete! Resources: 3 destroyed.
```
Verify in Cloudflare Dashboard: Worker and KV namespace are completely removed!

### Experiment 4: Reproduce / Recreate Infrastructure (STEP 29)
Without touching the Cloudflare dashboard:
```powershell
terraform apply -auto-approve
```
Within seconds, the complete serverless stack is restored identically from code!

---

## 8. GitHub Actions CI/CD Setup

1. Create a new GitHub repository:
   ```powershell
   git init
   git add .
   git commit -m "Initial commit: Serverless Student Task Manager IaC"
   git remote add origin https://github.com/<your-username>/student-task-manager-iac.git
   git branch -M main
   git push -u origin main
   ```
2. In GitHub, go to **Settings** > **Secrets and variables** > **Actions**.
3. Add two repository secrets:
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID
4. Make a code change (e.g. edit title in `application/worker.js`) and push:
   ```powershell
   git add .
   git commit -m "Update application header styling"
   git push
   ```
5. Check the **Actions** tab in GitHub to watch the automated pipeline execute `init` -> `validate` -> `plan` -> `apply`!
