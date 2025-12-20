# Remove Register Button from Header

## Quick Fix

### Step 1: Open the File
Open `src/components/Layout.js`

### Step 2: Find Lines 330-335
Press `Ctrl+F` and search for: `Register`

You'll find this code around line 330-335:

```javascript
<button
  onClick={() => navigate('/register')}
  className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow"
>
  Register
</button>
```

### Step 3: Delete Those Lines
Delete the entire button (lines 330-335), including:
- The opening `<button`
- All the props
- The `Register` text
- The closing `</button>`

### Step 4: Save
Press `Ctrl+S`

## Result
After this change, the header will only show the "Login" button for unauthenticated users, without the "Register" button.

The Login button will remain functional and users can still register through other means in your app.
