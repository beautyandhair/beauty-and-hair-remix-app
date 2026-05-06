import '@shopify/ui-extensions/preact';
import {render} from "preact";

import { useState, useEffect, useMemo, useCallback } from "preact/hooks";

const STAND_UP_TO_CANCER_TITLE = "Donation to Stand Up To Cancer";
const BREAST_CANCER_TITLE = "Donation to Breastcancer.org";
const EBEAUTY_TITLE = "Donation to Ebeauty";

const ENABLE_CAROUSEL = false;

const parseDate = (str) => {
  const [year, month, day] = str.split('-');

  return new Date(year, month - 1, day);
};

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const donationProducts = [STAND_UP_TO_CANCER_TITLE, BREAST_CANCER_TITLE];
  const currentDate = new Date();

  const { applyCartLinesChange, localization } = shopify;

  const [isLoading, setIsLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  const [settings, setSettings] = useState(shopify.settings.value);
  const {
    donation_order,
    donation_scheduled_order,
    donation_scheduled_start_date,
    donation_scheduled_end_date,
    donation_su2c_active,
    donation_su2c_gid,
    donation_bc_active,
    donation_bc_gid,
    donation_ebeauty_active,
    donation_ebeauty_gid
  } = useMemo(() => settings, [settings]);

  const [lines, setLines] = useState(shopify.lines.value);

  const [shippingAddress, setShippingAddress] = useState(shopify.shippingAddress.value);

  const [market, setMarket] = useState(localization.market.value);

  const donationOrder = useMemo(() => {
    const startDateValid = donation_scheduled_start_date ? parseDate(donation_scheduled_start_date) <= currentDate : true;
    const endDateValid = donation_scheduled_end_date ? parseDate(donation_scheduled_end_date) >= currentDate : true;

    if (startDateValid && endDateValid) {
      return donation_scheduled_order && typeof donation_scheduled_order === 'string' ? donation_scheduled_order.split(',').map((acronym) => acronym.trim()) : ["BC","SU2C","EBEAUTY"];
    }
    else {
      return donation_order && typeof donation_order === 'string' ? donation_order.split(',').map((acronym) => acronym.trim()) : ["SU2C","BC","EBEAUTY"];
    }
  }, []);

  const [donations, setDonations] = useState([
    {
      acronym: "SU2C",
      title: STAND_UP_TO_CANCER_TITLE,
      active: donation_su2c_gid && donation_su2c_active,
      isChecked: donationOrder[0] === "SU2C",
      showError: false,
      variantId: donation_su2c_gid
    },
    {
      acronym: "BC",
      title: BREAST_CANCER_TITLE,
      active: donation_bc_gid && donation_bc_active,
      isChecked: donationOrder[0] === "BC",
      showError: false,
      variantId: donation_bc_gid
    },
    {
      acronym: "EBEAUTY",
      title: EBEAUTY_TITLE,
      active: donation_ebeauty_gid && donation_ebeauty_active,
      isChecked: donationOrder[0] === "EBEAUTY",
      showError: false,
      variantId: donation_ebeauty_gid
    }
  ]);

  const activeDonations = donations.filter((donation) => donation.active).sort((a, b) => {
    return donationOrder.indexOf(a.acronym) - donationOrder.indexOf(b.acronym);
  });

  const removeDonations = useCallback(async (donationsRemoveFromCart) => {
    const removeDonationTitles = donationsRemoveFromCart.map((donation) => donation.title);
    const donationLines = lines.filter((line) => 
      donationProducts.includes(line.merchandise.title) && removeDonationTitles.includes(line.merchandise.title)
    );

    // Remove these donation lines from the cart
    for (const line of donationLines) {
      await applyCartLinesChange({
        type: 'removeCartLine',
        id: line.id,
        quantity: 1,
      });
    }

    setDonations((prevDonations) => prevDonations.map((donation) => ({...donation, isChecked: false})));
  }, [lines, applyCartLinesChange]);

  useEffect(() => {
    const timers = [];

    for (const donation of activeDonations) {
      if (donation.showError) {
        const timer = setTimeout(() => {
          donation.showError = false;
          setDonations((prev) => ([...prev]));
        }, 3000);

        timers.push(timer);
      }
    }

    return () => {
      for (const timer in timers) {
        clearTimeout(timer);
      }
    };
  }, [donations[0].showError, donations[1].showError]);

  useEffect(() => {
    if (market.handle !== 'us' || shippingAddress?.countryCode !== 'US') {
      removeDonations(donations);
    }
  }, [market.handle, shippingAddress?.countryCode]);

  useEffect(() => {
    shopify.settings.subscribe(setSettings);
    shopify.lines.subscribe(setLines);
    shopify.shippingAddress.subscribe(setShippingAddress);
    localization.market.subscribe(setMarket);

    if (market.handle !== 'us' || shippingAddress?.countryCode !== 'US') {
      return;
    }

    const donationsAddToCart = activeDonations.filter((donation) => donation.isChecked && !lines.some((line) => line.merchandise.id === donation.variantId));
    const donationsRemoveFromCart = activeDonations.filter((donation) => !donation.isChecked && lines.some((line) => line.merchandise.id === donation.variantId));

    if (donationsAddToCart.length) {
      for (const donation of donationsAddToCart) {
        handleAddToCart(donation);
      }
    }

    if (donationsRemoveFromCart.length) {
      removeDonations(donationsRemoveFromCart);
    }

    return () => {
      removeDonations(donations);
    }
  }, []);

  async function handleAddToCart(donation) {
    setIsLoading(true);

    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: donation.variantId,
      quantity: 1,
    });

    if (result.type === 'error') {
      donation.showError = true;
      setDonations((prev) => ([...prev]));

      console.error(result.message);
    }

    setIsLoading(false);
  }

  async function handleRemoveFromCart(donation) {
    setIsLoading(true);

    const cartLineId = findCartLineIdByVariantId(donation.variantId);

    if (!cartLineId) {
      console.error("Cart line not found for variant:", donation.variantId);
      return;
    }

    const result = await applyCartLinesChange({
      type: 'removeCartLine',
      id: cartLineId,
      quantity: 1,
    });

    if (result.type === 'error') {
      donation.showError = true;
      setDonations((prev) => ([...prev]));
      
      console.error(result.message);
    }

    setIsLoading(false);
  }

  function findCartLineIdByVariantId(variantId) {
    const line = lines.find((line) => line.merchandise.id === variantId);
    return line ? line.id : null;
  }

  const toggleCheckbox = (donation) => () => {
    if (isLoading) return;

    if (donation.isChecked) {
      handleRemoveFromCart(donation);
    } else if (shippingAddress?.countryCode === "US") {
      handleAddToCart(donation);
    }
    else {
      return;
    }

    donation.isChecked = !donation.isChecked;
    setDonations((prev) => ([...prev]));
  }

  if (market.handle !== 'us' || shippingAddress?.countryCode !== 'US') {
    return null;
  }

  return (
    <s-stack gap="small-300">
      {activeDonations.map((donation, index) =>
        <DonationCheckbox
          key={donation.title}
          toggleCheckbox={toggleCheckbox(donation)}
          donation={donation}
          isLoading={isLoading}
          index={index}
          currentSlide={slide}
        />
      )}
      
      {ENABLE_CAROUSEL && (
        <s-grid gridTemplateColumns="auto auto" alignItems="center" gap="small-300" display={activeDonations.length > 1 ? 'auto' : 'none'}>
          <s-clickable maxBlockSize="32px" maxInlineSize="32px" border="base" borderRadius="base" padding="small-300" disabled={slide === 0} onClick={() => setSlide((prev) => prev - 1)}>
            <s-icon type="chevron-left" tone="neutral" />
          </s-clickable>
          <s-clickable maxBlockSize="32px" maxInlineSize="32px" border="base" borderRadius="base" padding="small-300" disabled={slide === activeDonations.length - 1} onClick={() => setSlide((prev) => prev + 1)}>
            <s-icon type="chevron-right" tone="neutral" />
          </s-clickable>
        </s-grid>
      )}
    </ s-stack>
  );
}


function DonationCheckbox({toggleCheckbox, donation, isLoading, index, currentSlide}) {
  if (!donation || !donation.active) {
    return null;
  }

  let checkBoxText;
  let donationLogo;
  let donationLogoSmall;
  let donationInfo;

  if (donation.title === STAND_UP_TO_CANCER_TITLE) {
    checkBoxText = "Yes, I’d love to support cancer research by donating $1.00";
    donationLogo = "https://cdn.shopify.com/s/files/1/1410/9094/files/SU2CFullLogo_resized.webp?v=1715370025";
    donationLogoSmall = "https://cdn.shopify.com/s/files/1/1410/9094/files/BrandingLogoFullNameCAPS_2-1_2_50x22_341f043b-ebb9-42c4-a322-23f0fecb871d.webp?v=1715962600"
    donationInfo = "Stand Up To Cancer’s (SU2C) mission is to raise funds to accelerate the pace of groundbreaking translational research that can get new therapies to patients quickly and save lives now. SU2C brings together the best and the brightest researchers and mandates collaboration among the cancer community. By galvanizing the entertainment industry, SU2C has set out to generate awareness, educate the public on cancer prevention, and help more people diagnosed with cancer become long-term survivors."
  } else if (donation.title === BREAST_CANCER_TITLE) {
    checkBoxText = "Yes, I'd love to help others with Breast Cancer by donating $1.00"
    donationLogo = "https://cdn.shopify.com/s/files/1/1410/9094/files/BCO_Logo_FullColor_RGB.jpg?v=1668739547";
    donationLogoSmall = "https://cdn.shopify.com/s/files/1/1410/9094/files/BCO_Logo_FullColor_RGB_143x22_bd3f0d64-4de3-48d4-b29c-c7584e97be53.webp?v=1715963464"
    donationInfo = "Breastcancer.org was founded in 2000 by renowned breast oncologist Marisa C. Weiss, M.D. to help those affected by breast cancer make sense of complex medical information and empower them to make the best decisions throughout their medical and emotional journey. Support Breastcancer.org today with your donation – and help someone facing a breast cancer diagnosis to get the information and support they need to make the best decisions for their lives."
  } else if (donation.title === EBEAUTY_TITLE) {
    checkBoxText = "Yes, I'd love to help Ebeauty provide free wigs to cancer patients by donating $1.00"
    donationLogo = "https://cdn.shopify.com/s/files/1/1410/9094/files/EBeauty-logo-2024_info_logo.png?v=1751396110";
    donationLogoSmall = "https://cdn.shopify.com/s/files/1/1410/9094/files/EBeauty-logo-2024_small_43ddd04f-453d-471a-b9d3-ca3b5de124d5.png?v=1751392236"
    donationInfo = "EBeauty’s mission is to improve the quality of life for women undergoing cancer treatment by providing free wigs and community support services."
  }

  return (
    <s-stack gap="base" border="base" borderRadius="base" padding="base" display={ENABLE_CAROUSEL && currentSlide != index ? 'none' : 'auto'}>
      <s-stack
        direction="inline"
        padding="none"
        alignItems="center"
        maxBlockSize="50px"
        gap="base"
      >
        <s-box maxBlockSize="80px">
          <s-image
            src={donationLogoSmall}
            objectFit="contain"
            alt="Donation Logo"
            inlineSize="auto"
          />
        </s-box>

        <s-stack direction="inline" gap="small-300" alignItems="start">
          <s-clickable commandFor={`donation-popover-${index}`}>
            <s-icon type="info" tone="custom"  />
          </s-clickable>
          
          <s-popover
            id={`donation-popover-${index}`}
          >
            <s-box
              maxInlineSize="450px"
              padding="base"
            >
              <s-image
                src={donationLogo}
                objectFit="contain"
                alt="Donation Logo"
                inlineSize="auto"
              />
              <s-paragraph>
                {donationInfo}
              </s-paragraph>
            </s-box>
          </s-popover>
        </s-stack>
      </s-stack>

      <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="start">
        <s-checkbox
          checked={donation.isChecked}
          onChange={toggleCheckbox}
          disabled={isLoading}
        />

        <s-text>{checkBoxText}</s-text>
      </s-grid>

      {donation.showError && <ErrorBanner/>}
    </s-stack>
  );
}

function ErrorBanner() {
  return (
    <s-banner tone='critical'>
      There was an issue with your request. Please try again.
    </s-banner>
  );
}