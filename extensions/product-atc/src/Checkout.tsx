import '@shopify/ui-extensions/preact';
import {render} from "preact";

import { useState, useEffect, useMemo } from "preact/hooks";

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const { query, i18n, applyCartLinesChange, localization, buyerIdentity } = shopify;

  const [product, setProduct] = useState<{title: string, description: string, imageSrc: string, price: number}>();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [country, setCountry] = useState(localization.country.value);
  const [lines, setLines] = useState(shopify.lines.value);

  const [settings, setSettings] = useState(shopify.settings.value);
  const {
    product_gid,
    product_title
  } = useMemo(() => settings, [settings]);

  useEffect(() => {
    fetchProduct();

    localization.country.subscribe(setCountry);
    shopify.lines.subscribe(setLines);
    shopify.settings.subscribe(setSettings);
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  useEffect(() => {
    if (product) {
      const isInCart = lines.some(line => line.merchandise.id === product_gid);
      
      setIsAdded(isInCart);
    }
  }, [product, lines]);

  async function handleAddToCart() {
    if (typeof product_gid === "string") {
      setAdding(true);

      const result = await applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: product_gid,
        quantity: 1,
      });

      setAdding(false);

      if (result.type === 'error') {
        setShowError(true);
        console.error(result.message);
      }
    }
  }

  async function handleRemoveFromCart() {
    setAdding(true);
    
    const cartLineId = findCartLineIdByVariantId(product_gid);

    if (!cartLineId) {
      console.error("Cart line not found for variant:", product_gid);
      return;
    }

    const result = await applyCartLinesChange({
      type: 'removeCartLine',
      id: cartLineId,
      quantity: 1,
    });

    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }

    setAdding(false);
  }

  function addToCartHandlerButton() {
    if (loading) return;

    if (isAdded) {
      handleRemoveFromCart();
    } else {
      handleAddToCart();
    }

    setIsAdded(!isAdded);
  }

  function findCartLineIdByVariantId(variantId) {
    const line = lines.find(line => line.merchandise.id === variantId);

    return line ? line.id : null;
  }

  async function fetchProduct() {
    setLoading(true);

    try {
      const { data } = await query<{products: {nodes: {
        title: string,
        description: string,
        images: {nodes: { url: string }[]},
        variants: {nodes: {price: { amount: number }}[]}
      }[]}}>(
        `query Products @inContext(country: ${country.isoCode}) {
          products(first: 1, query: "title:'${product_title}'") {
            nodes {
              title
              description
              images(first: 1) {
                nodes {
                  url
                }
              }
              variants(first: 1) {
                nodes {
                  price {
                    amount
                  }
                }
              }
            }
          }
        }`
      );

      if (data.products.nodes[0]) {
        setProduct({
          title: data.products.nodes[0].title,
          description: data.products.nodes[0].description,
          imageSrc: data.products.nodes[0].images.nodes[0].url,
          price: data.products.nodes[0].variants.nodes[0].price.amount
        });
      }
    } catch (error) {
      console.error(error, 'Error fetching product');
    } finally {
      setLoading(false);
    }
  }

  if ((!loading && !product) || !buyerIdentity || loading) {
    return null;
  }

  return (
    <ProductCard
      product={product}
      i18n={i18n}
      adding={adding}
      addToCartHandlerButton={addToCartHandlerButton}
      isAdded={isAdded}
      showError={showError}
    />
  );
}

function ProductCard({product, i18n, adding, addToCartHandlerButton, showError, isAdded}) {
  const { imageSrc, description, title, price} = product;
  const renderPrice = i18n.formatCurrency(price);

  return (
    <s-stack gap="small-300" border="base" padding="base" borderRadius="base">
      <s-grid
        gap="base"
        gridTemplateColumns="64px 1fr auto"
        alignItems='center'
      >
        <s-image
          borderRadius="base"
          src={imageSrc}
          aspectRatio="1/1"
          inlineSize="auto"
        />

        <s-stack gap='none'>
          <s-stack direction="inline" gap="small-300">
            <s-heading>
              {title}
            </s-heading>
          </s-stack>

          <s-text>
            {description}
          </s-text>
            
          <s-text tone="custom">{renderPrice}</s-text>
        </s-stack>

        <s-button
            variant="secondary"
            loading={adding}
            accessibilityLabel={`Add ${title} to cart`}
            onClick={addToCartHandlerButton}
        >
          {isAdded ? 'Remove' : "Add"}
        </s-button>
      </s-grid>

      {showError && <ErrorBanner/>}
    </s-stack>
  );
}

function ErrorBanner() {
  return (
    <s-banner tone='critical'>
      There was an issue adding this product. Please try again.
    </s-banner>
  );
}
