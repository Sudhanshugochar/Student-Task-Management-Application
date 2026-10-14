# Project Evaluation Screenshots Checklist

This directory is designated for storing the evidence screenshots required for the project evaluation and final submission (Section 32 F & Section 12).

---

## Required Screenshots Matrix

| # | Screenshot Filename | Description / Required Terminal Output | Evaluation Step |
|---|---------------------|----------------------------------------|-----------------|
| 1 | `01_terraform_version.png` | Output of `terraform --version` showing version (v1.16.x) | STEP 2 |
| 2 | `02_git_version.png` | Output of `git --version` showing Git installed | STEP 3 |
| 3 | `03_terraform_init.png` | Terminal showing `Terraform has been successfully initialized!` | STEP 12 |
| 4 | `04_terraform_validate.png` | Terminal showing `Success! The configuration is valid.` | STEP 14 |
| 5 | `05_terraform_plan.png` | Execution plan displaying resources to be created (`+`) | STEP 15 |
| 6 | `06_terraform_apply.png` | Terminal showing `Apply complete! Resources: 3 added, 0 changed, 0 destroyed.` | STEP 16 |
| 7 | `07_cloudflare_worker.png` | Cloudflare Dashboard: **Workers & Pages** showing `student-task-manager` | STEP 17 |
| 8 | `08_cloudflare_kv.png` | Cloudflare Dashboard: **Workers & Pages > KV** showing `student_tasks` | STEP 17 |
| 9 | `09_app_web_interface.png` | Browser window showing the Student Task Management UI loaded | STEP 18 |
| 10 | `10_crud_create_task.png` | UI showing newly added task (e.g. `T101: Prepare Final Year Project Presentation`) | STEP 19 (Test 1) |
| 11 | `11_crud_read_task.png` | UI displaying all academic tasks in the registry | STEP 19 (Test 2) |
| 12 | `12_crud_update_task.png` | UI showing status updated from `Pending` to `Completed` | STEP 19 (Test 3) |
| 13 | `13_crud_delete_task.png` | UI showing task removed from table and KV storage | STEP 19 (Test 4) |
| 14 | `14_terraform_show.png` | Terminal output of `terraform show` displaying active state resources | STEP 20 |
| 15 | `15_iac_modify_plan.png` | Terminal showing `terraform plan` detecting modified configuration (`~`) | STEP 21 |
| 16 | `16_github_repository.png` | Browser showing GitHub repository files and commit history | STEP 22 |
| 17 | `17_github_secrets.png` | GitHub Settings > Secrets & variables > Actions showing configured secrets | STEP 24 |
| 18 | `18_github_actions_pipeline.png` | GitHub Actions tab showing green passing CI/CD deployment workflow | STEP 26 |
| 19 | `19_terraform_destroy.png` | Terminal output showing `Destroy complete! Resources: 3 destroyed.` | STEP 27 |
| 20 | `20_infra_recreation.png` | Terminal showing subsequent `terraform apply` recreating entire infrastructure | STEP 29 |

---

## Instructions for Capturing Screenshots
1. On Windows, use `Win + Shift + S` or the **Snipping Tool** to capture screenshots.
2. Save the images in PNG format with the exact filenames listed above inside this `screenshots/` directory.
3. Embed these screenshots in Chapter 9 ("Testing and Results") of the final Mini Project Report.
