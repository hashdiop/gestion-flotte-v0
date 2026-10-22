'use client';

// Bouton d'envoi qui demande confirmation avant une action difficile à annuler
export default function ConfirmButton({ message, children, ...props }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
