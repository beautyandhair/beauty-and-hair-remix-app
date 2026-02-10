class VariantSwatchPicker extends HTMLElement {
  constructor() {
    super();

    let variantSelect = document.querySelector(`variant-selects select`);

    variantSelect?.addEventListener("change", (event) => {
      this.querySelector(`input[name="swatch_color"][value="${event.target.value}"]`).checked = true;
    });

    this.querySelectorAll('.swatch-picker__color-group')?.forEach((colorGroup) => colorGroup.addEventListener("click", (_event) => this.setAttribute('data-group', colorGroup.dataset.group)));

    this.querySelector('.swatch-picker__container')?.addEventListener('change', (event) => this.onSwatchRadioChange(event, variantSelect));
  }

  onSwatchRadioChange(event, variantSelect) {
    if (variantSelect && variantSelect.value != event.target.value) {
      variantSelect.value = event.target.value;
      variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

customElements.define('variant-swatch-picker', VariantSwatchPicker);
