# LeadLinx System Testing Guide

Welcome to the LeadLinx testing guide! This document provides clear, step-by-step instructions to verify that the core features of the LeadLinx platform are working correctly. You don't need to be a developer to follow these steps.

---

## 1. Testing the User Signup & Dashboard

**Goal:** Ensure a new user can create an account and access the dashboard with the correct default settings.

**Steps:**
1. Open your browser and navigate to `http://localhost:3000/signup`.
2. Fill out the signup form with a test name, email, and password.
3. Click the "Create Account" button.
4. You should be automatically redirected to your dashboard (`http://localhost:3000/dashboard`).

**Expected Results:**
- You are redirected to the dashboard.
- The top-right corner shows your name and a "Log out" button.
- The sidebar displays your current credits. **You should have exactly 50 credits.**
- You should see the main search area to find Reddit leads.

**Possible Issues/Edge Cases:**
- If you use an email that already exists, you should see an error message.
- If you don't see 50 credits, the signup default plan might not be configured correctly.

---

## 2. Testing the Credit System & Search

**Goal:** Ensure that searching for leads correctly deducts 1 credit and that the system prevents searching when credits are empty.

**Steps:**
1. On the dashboard (`http://localhost:3000/dashboard`), ensure you have at least 1 credit.
2. In the "Keywords" input, type a test keyword like `crm`.
3. Click "Find Leads".
4. Wait for the search to complete (this may take a few seconds as it calls the AI and Reddit).

**Expected Results:**
- The page displays a list of Reddit posts related to your keyword.
- **Crucial:** Look at your credit balance in the sidebar. It should have **decreased by exactly 1**.

**Testing the Empty Credit Edge Case:**
1. (Developer Note: To easily test this, an admin might need to set your credits to 0 in the database).
2. Assuming your credits are 0, try to perform a search.
3. **Expected Result:** The system should block the search and display a warning banner at the top of the dashboard stating you are out of credits, with a button prompting you to upgrade your plan.

**Possible Issues/Edge Cases:**
- If your credits decrease by more than 1 per search, there is an issue with the credit deduction logic.
- If the search fails but a credit is still deducted, this is an error in how failures are handled.

---

## 3. Testing the Pricing Page & Navigation

**Goal:** Verify that the pricing page shows the correct plans and that the top navigation bar behaves correctly depending on whether you are logged in or logged out.

**Steps:**
1. While still logged in, click "Pricing" in the top navigation bar.
2. You should see three plans: Free ($0), Starter ($3.99), and Premium ($7.99).
3. The top right corner should still say "Dashboard" and "Log out".
4. Click "Log out". You should be redirected to the home page.
5. Click "Pricing" again.
6. The top right corner should now say "Log in" and "Get Started".

**Expected Results:**
- The prices are exactly $0, $3.99, and $7.99.
- The navigation bar clearly knows if you are logged in or logged out across all pages.

**Possible Issues/Edge Cases:**
- If you see old prices like $49 or $149, the pricing page wasn't updated correctly.
- If you log out but still see a "Dashboard" link on the pricing page, the navigation bar is broken.

---

## 4. Testing the Blog System

**Goal:** Ensure that public users can read blog posts and that admins can create and manage them.

### Part A: Public Blog Viewing
**Steps:**
1. (Ensure you are logged out). Navigate to `http://localhost:3000/blog`.
2. You should see a list of blog posts (e.g., "How to Find Leads on Reddit in 2024").
3. Click on the title of a blog post.

**Expected Results:**
- You are taken to the article page and can read the full content.

### Part B: Admin Blog Management
**Steps:**
1. Navigate to `http://localhost:3000/login` and log in with your admin credentials (e.g., `tarekaldali1@gmail.com`).
2. Navigate directly to the admin blog manager: `http://localhost:3000/admin/blog`.
3. Click the "Create Blog Post" button.
4. Fill in a Title and some Content.
5. Click "Publish Post".
6. Find your new post in the table below and click the "Edit" (pencil) icon.
7. Change the title and click "Update Post".
8. Finally, click the "Delete" (trash can) icon for the post you just made and confirm.

**Expected Results:**
- The post is successfully created and appears in the table.
- Editing the post updates the title in the table.
- Deleting the post removes it completely from the table.

**Possible Issues/Edge Cases:**
- If you get an "unauthorized" error accessing the admin page, your account does not have admin privileges.
- If images fail to upload, there may be an issue with the image handling system.

---

## 5. Testing the Admin Dashboard

**Goal:** Ensure the admin overview accurately reflects the system status.

**Steps:**
1. As an admin, navigate to `http://localhost:3000/admin`.
2. Look at the "MRR" (Monthly Recurring Revenue) metric.
3. Look at the "System Health" indicators.

**Expected Results:**
- The MRR calculation should reflect the new pricing tiers (e.g., $3.99 or $7.99 per paid user).
- System Health should show "Operational" for key services.

**Possible Issues/Edge Cases:**
- If the MRR shows massive numbers based on old $149 tiers, the revenue calculation is outdated.

---

**If any of these tests fail or produce unexpected results, please take a screenshot and report it to the development team.**
