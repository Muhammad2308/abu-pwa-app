# Backend Prompt: Update Projects Table Raised Column Gracefully

## Problem Statement

The `projects` table has a `raised` column that should be automatically updated whenever a donation payment is successfully completed. Currently, the raised amount is not updating properly after donations, causing the frontend to display incorrect fundraising progress.

## Requirements

### 1. **Automatic Update on Payment Success**

The `raised` column must be updated in **TWO places** when a payment is successfully completed:

#### A. Payment Verification Endpoint (`/api/payments/verify`)
- When payment verification succeeds and donation record is created
- Update the project's `raised` column immediately

#### B. Paystack Webhook Handler
- When Paystack webhook confirms payment success
- Update the project's `raised` column as a backup/confirmation

### 2. **Calculation Logic**

The `raised` amount should be calculated as:
```php
$totalRaised = Donation::where('project_id', $projectId)
    ->where('status', 'completed')
    ->sum('amount');
```

**Important:**
- Only count donations with `status = 'completed'`
- Only count donations for the specific project (`project_id` matches)
- Sum the `amount` field from donations table

### 3. **Graceful Error Handling**

The update should be **non-blocking** and handle errors gracefully:

```php
try {
    // Calculate total raised
    $totalRaised = Donation::where('project_id', $projectId)
        ->where('status', 'completed')
        ->sum('amount');
    
    // Update project
    $project = Project::find($projectId);
    if ($project) {
        $project->update(['raised' => $totalRaised]);
        
        // Log success for debugging
        \Log::info("Project raised amount updated", [
            'project_id' => $projectId,
            'raised' => $totalRaised,
            'donation_id' => $donationId
        ]);
    }
} catch (\Exception $e) {
    // Log error but don't fail the payment process
    \Log::error("Failed to update project raised amount", [
        'project_id' => $projectId,
        'error' => $e->getMessage(),
        'donation_id' => $donationId
    ]);
    
    // Continue with payment processing - don't throw exception
}
```

### 4. **Database Transaction Safety**

If using database transactions for payment processing:
- The project update should be **inside the same transaction** as the donation creation
- If transaction fails, both donation and project update should rollback
- If transaction succeeds, both should commit together

### 5. **Edge Cases to Handle**

#### A. Endowment Fund (No Project)
- If `project_id` is NULL, skip project update
- Only update `raised` for specific projects

#### B. Multiple Simultaneous Payments
- Use database locking or transactions to prevent race conditions
- Ensure concurrent payments don't cause incorrect `raised` calculations

#### C. Payment Status Changes
- If a donation status changes from `completed` to `failed` or `pending`, recalculate `raised`
- Handle status updates gracefully

#### D. Deleted Projects
- Check if project exists before updating
- Don't update if project is soft-deleted

### 6. **Implementation Locations**

#### Location 1: Payment Verification Endpoint
**File:** `app/Http/Controllers/PaymentController.php` (or similar)
**Method:** `verify()` or `handlePaymentVerification()`

```php
// After creating/updating donation record
if ($donation->project_id) {
    $this->updateProjectRaised($donation->project_id);
}
```

#### Location 2: Paystack Webhook Handler
**File:** `app/Http/Controllers/WebhookController.php` (or similar)
**Method:** `handlePaystackWebhook()`

```php
// After confirming payment success
if ($donation->project_id) {
    $this->updateProjectRaised($donation->project_id);
}
```

### 7. **Helper Method (Recommended)**

Create a reusable method to update project raised amount:

```php
/**
 * Update the raised amount for a project
 * 
 * @param int $projectId
 * @param int|null $donationId Optional donation ID for logging
 * @return bool Success status
 */
protected function updateProjectRaised($projectId, $donationId = null)
{
    try {
        // Find project
        $project = Project::find($projectId);
        
        if (!$project) {
            \Log::warning("Project not found for raised update", [
                'project_id' => $projectId,
                'donation_id' => $donationId
            ]);
            return false;
        }
        
        // Calculate total raised from completed donations
        $totalRaised = Donation::where('project_id', $projectId)
            ->where('status', 'completed')
            ->sum('amount');
        
        // Update project
        $project->update(['raised' => $totalRaised ?? 0]);
        
        \Log::info("Project raised amount updated successfully", [
            'project_id' => $projectId,
            'project_title' => $project->project_title,
            'raised' => $totalRaised,
            'donation_id' => $donationId
        ]);
        
        return true;
    } catch (\Exception $e) {
        \Log::error("Failed to update project raised amount", [
            'project_id' => $projectId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'donation_id' => $donationId
        ]);
        
        // Don't throw - allow payment processing to continue
        return false;
    }
}
```

### 8. **Database Schema Verification**

Ensure the `projects` table has the `raised` column:

```sql
-- Check if column exists
SHOW COLUMNS FROM projects LIKE 'raised';

-- If not exists, add it:
ALTER TABLE projects 
ADD COLUMN raised DECIMAL(10, 2) DEFAULT 0.00 AFTER target_amount;

-- Add index for performance (optional but recommended)
CREATE INDEX idx_projects_raised ON projects(raised);
```

### 9. **Testing Checklist**

After implementation, test:

- [ ] Single donation updates project raised correctly
- [ ] Multiple donations accumulate correctly
- [ ] Endowment donations (no project) don't cause errors
- [ ] Failed payments don't update raised amount
- [ ] Webhook updates work correctly
- [ ] Payment verification updates work correctly
- [ ] Concurrent payments don't cause race conditions
- [ ] Deleted projects don't cause errors
- [ ] Logs are created for debugging

### 10. **API Response Verification**

Ensure the API endpoints return the `raised` field:

**GET /api/projects**
```json
[
  {
    "id": 1,
    "project_title": "Road Network",
    "target": 5000000.00,
    "raised": 1250000.00,  // ✅ Must be present and accurate
    ...
  }
]
```

**GET /api/projects-with-photos**
```json
[
  {
    "id": 1,
    "project_title": "Road Network",
    "target": 5000000.00,
    "raised": 1250000.00,  // ✅ Must be present and accurate
    ...
  }
]
```

### 11. **Performance Considerations**

- Use database indexes on `donations.project_id` and `donations.status`
- Consider caching if calculation becomes slow (but ensure cache invalidation on updates)
- Use `sum()` aggregation which is efficient in most databases

### 12. **Logging Requirements**

Log the following for debugging:
- When project raised is updated
- Project ID, old raised amount, new raised amount
- Donation ID that triggered the update
- Any errors that occur during update

## Summary

**Key Points:**
1. ✅ Update `raised` in BOTH payment verification AND webhook handler
2. ✅ Only count `status = 'completed'` donations
3. ✅ Handle errors gracefully (don't break payment flow)
4. ✅ Use transactions for data consistency
5. ✅ Skip update if `project_id` is NULL (endowment)
6. ✅ Log all updates for debugging
7. ✅ Ensure API returns `raised` field in responses

**Expected Behavior:**
- When a donation payment completes → `projects.raised` updates automatically
- Frontend displays correct raised amount immediately
- Multiple donations accumulate correctly
- No errors break the payment flow

---

**Please implement this update in the backend codebase following the guidelines above.**

