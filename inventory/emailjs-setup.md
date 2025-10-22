# EmailJS Setup Instructions

## Step 1: Create EmailJS Account
1. Go to [emailjs.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create Email Service
1. Go to Email Services in your dashboard
2. Click "Add New Service"
3. Choose Gmail, Outlook, or other email provider
4. Connect your email account
5. Note down the **Service ID**

## Step 3: Create Email Template
1. Go to Email Templates
2. Click "Create New Template"
3. Use this template structure:

```
Subject: {{subject}}

Dear Procurement Team,

{{message}}

Best regards,
{{from_name}}

Reply to: {{reply_to}}
```

4. Save and note down the **Template ID**

## Step 4: Get Public Key
1. Go to Account > General
2. Copy your **Public Key**

## Step 5: Update Code
Replace these values in `Helth.jsx`:

```javascript
const serviceID = 'service_your_service_id'; // Your Service ID
const templateID = 'template_your_template_id'; // Your Template ID  
const publicKey = 'your_public_key'; // Your Public Key
```

## Alternative: Gmail SMTP (Server-side)
For production use, consider using server-side email sending:
- Node.js with Nodemailer
- SendGrid API
- AWS SES
- Mailgun

## Current Status
- EmailJS library installed ✅
- Code structure ready ✅  
- Need to configure credentials ❌

The system will show setup instructions until credentials are configured.