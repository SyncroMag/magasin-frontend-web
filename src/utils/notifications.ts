import Swal from 'sweetalert2'

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
})

export function notifySuccess(message: string) {
  void toast.fire({ icon: 'success', title: message })
}

export function notifyError(message: string) {
  void toast.fire({ icon: 'error', title: message })
}

export function notifyInfo(message: string) {
  void toast.fire({ icon: 'info', title: message })
}

export function importantAlert(
  title: string,
  text: string,
  icon: 'success' | 'error' | 'info' | 'warning' = 'info',
) {
  return Swal.fire({
    title,
    text,
    icon,
    showCloseButton: true,
    confirmButtonText: 'OK',
    allowOutsideClick: true,
    allowEscapeKey: true,
  })
}

export async function confirmAction(title: string, text: string) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCloseButton: true,
    showCancelButton: true,
    confirmButtonText: 'Confirmer',
    cancelButtonText: 'Annuler',
    reverseButtons: true,
  })

  return result.isConfirmed
}
