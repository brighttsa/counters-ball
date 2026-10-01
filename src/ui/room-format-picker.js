const picker = document.getElementById('room-format-picker');
const value = document.getElementById('live-room-format');
const label = document.getElementById('room-format-value');
const summary = picker.querySelector('summary');

function closePicker(returnFocus = false) {
  picker.open = false;
  if (returnFocus) summary.focus();
}

picker.addEventListener('change', (event) => {
  const input = event.target;
  if (input.name !== 'room-format-choice') return;
  value.value = input.value;
  label.textContent = input.closest('label').querySelector('span').textContent;
});

picker.addEventListener('click', (event) => {
  // Let the radio's native change event update the mode before hiding its row.
  if (event.target.matches('input[type="radio"]')) closePicker(true);
});

picker.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || (event.key === 'Enter' && event.target.matches('input[type="radio"]'))) {
    event.preventDefault();
    closePicker(true);
  }
});

document.addEventListener('pointerdown', (event) => {
  if (picker.open && !picker.contains(event.target)) closePicker();
});

document.addEventListener('focusin', (event) => {
  if (picker.open && !picker.contains(event.target)) closePicker();
});
