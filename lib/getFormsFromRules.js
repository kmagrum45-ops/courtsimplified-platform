import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function getFormsFromRules(userText) {
  const text = userText.toLowerCase()

  const { data: rules, error } = await supabase
    .from('form_rules')
    .select('*')
    .eq('case_type', 'family')

  if (error) {
    console.error(error)
    return []
  }

  let matchedForms = []

  for (const rule of rules) {
    const triggers = rule.trigger_words.toLowerCase().split(',')

    const isMatch = triggers.some(word =>
      text.includes(word.trim())
    )

    if (isMatch) {
      matchedForms.push({
        situation: rule.situation,
        required: rule.required_forms,
        optional: rule.optional_forms,
        explanation: rule.explanation
      })
    }
  }

  return matchedForms
}