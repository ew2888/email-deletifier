## 1. **Objective**

* **Goal:** Automatically detect and mark advertising emails in your inbox for deletion.
* **Scope:** No other email categorisation; only identify advertising (promotional, marketing, sales emails) and mark/delete them.

---

## 2. **System Overview**

* **Inputs:** Raw emails from your inbox (via IMAP/POP3 or API).
* **Process:** AI model analyses each email, determines if it’s advertising.
* **Outputs:** Advertising emails are marked (labelled, moved, or deleted as per setup).

---

## 3. **Key Components**

### 1. **Email Fetcher**

* Connects to your email provider (IMAP/POP3 or Gmail/Outlook API).
* Downloads new/unread emails for processing.

### 2. **Preprocessing Engine**

* Extracts subject, sender, body, headers, and attachments.
* Converts HTML to text for analysis.

### 3. **AI Classifier**

* Model (LLM or traditional ML) trained to spot advertising.
* Features: sender reputation, keywords (“sale”, “offer”, “unsubscribe”), email structure, presence of tracking pixels, sender domain, etc.

### 4. **Action Handler**

* If AI confidence > threshold, email is:

  * Labelled as “To Delete”, or
  * Moved to Trash/Deleted Items, or
  * Flagged for review (optional, as a safety net).

### 5. **Audit Log (Optional)**

* Logs actions for transparency (helpful for tuning).

---

## 4. **Workflow Diagram**

```
[Inbox] 
   ↓
[Fetcher] 
   ↓
[Preprocessor] 
   ↓
[AI Classifier] 
   ↓
[Is Advertising?] ——→ [Yes] → [Mark/Delete]
                   ↓
                  [No] → [Do Nothing]
```

---

## 5. **Implementation Notes**

* **AI Model:**

  * Start with a simple model (e.g. fine-tuned BERT or use GPT with zero/few-shot prompts).
  * Example prompt: “Is this email advertising/promotional? Reply YES or NO.”
  * Improve with feedback loop.

* **Tech Stack:**

  * Python (popular libraries: `imaplib`, `email`, `transformers`, `scikit-learn`).
  * Cron job or daemon for regular checking.
  * Use OAuth2 for secure API access.

* **Deletion Policy:**

  * *Mark for deletion first* (safer), then after review or X days, auto-delete.
  * Optional: Whitelist important senders to prevent accidental deletion.

* **Privacy:**

  * Run locally, or on a secure server.
  * Do not forward emails externally unless required for cloud AI.

---

## 6. **Sample Minimal Python Flow**

```python
# Pseudocode for illustration
for email in fetch_inbox():
    subject, sender, body = extract(email)
    if ai_model.predict_is_advertising(subject, sender, body):
        mark_for_deletion(email)
```

---

## 7. **Future Enhancements**

* Self-learning: Allow user to correct errors; system retrains.
* Dashboard for reviewing flagged emails.
* Multi-account support.

