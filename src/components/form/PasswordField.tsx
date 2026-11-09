import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { FormField, type FormFieldProps } from './FormField'
import styles from './FormField.module.css'

type PasswordFieldProps = Omit<FormFieldProps, 'type' | 'icon' | 'trailing'>

/** FormField preconfigured for passwords, with an accessible show/hide toggle. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const ToggleIcon = visible ? EyeOff : Eye

  return (
    <FormField
      {...props}
      icon={Lock}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className={styles.trailingButton}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-controls={props.id}
        >
          <ToggleIcon size={22} strokeWidth={1.5} aria-hidden="true" />
        </button>
      }
    />
  )
}
