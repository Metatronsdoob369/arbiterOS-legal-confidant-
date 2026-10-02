import re

with open('components/LegalAdvisor.tsx', 'r') as f:
    text = f.read()

# Add useCallback to handleDownloadDraft
find_str = "  const handleDownloadDraft = async (draftId: string) => {"
replace_str = "  const handleDownloadDraft = React.useCallback(async (draftId: string) => {"

if find_str in text:
    text = text.replace(find_str, replace_str)
    # find where it ends
    start_idx = text.find(replace_str)
    end_idx = text.find("  };", start_idx)
    text = text[:end_idx] + "  }, [addEntry]);" + text[end_idx+4:]
else:
    print("could not find handleDownloadDraft")

# Add a comment to the component.
memo_def = "const MemoizedMessageItem = React.memo<{"
comment_memo = "/**\n * ⚡ Bolt Optimization: Extracted and wrapped the message item in React.memo\n * to prevent O(N) re-rendering of massive chat histories when typing fast.\n */\n"
if memo_def in text:
    text = text.replace(memo_def, comment_memo + memo_def)

with open('components/LegalAdvisor.tsx', 'w') as f:
    f.write(text)
