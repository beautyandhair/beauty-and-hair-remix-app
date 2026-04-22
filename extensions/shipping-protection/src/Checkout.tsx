import '@shopify/ui-extensions/preact';
import {render} from "preact";

import { useState, useEffect } from "preact/hooks";

import type {
  Market
} from '@shopify/ui-extensions/checkout';

// 1. Export the extension
export default async () => {
  render(<Extension />, document.body)
};

function Extension() {
  const { query, i18n, applyCartLinesChange, localization } = shopify;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const [market, setMarket] = useState<Market>(localization.market.value);
  const [shippingAddress, setShippingAddress] = useState(shopify.shippingAddress.value);
  const [lines, setLines] = useState(shopify.lines.value);

  useEffect(() => {
    localization.market.subscribe(setMarket);
    shopify.shippingAddress.subscribe(setShippingAddress);
    shopify.lines.subscribe(setLines);

    fetchProducts();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  useEffect(() => {
    if (products.length > 0) {
      const variantId = products[0].variants.nodes[0].id;
      const isInCart = lines.some(line => line.merchandise.id === variantId);
      setIsAdded(isInCart);
    }
  }, [products, lines]);

  useEffect(() => {
    if ((market.handle !== 'us' || shippingAddress?.countryCode !== 'US') && isAdded) {
      const variantId = products[0]?.variants.nodes[0]?.id;
      handleRemoveFromCart(variantId);
      setIsAdded(false);
    }
  }, [market.handle, shippingAddress?.countryCode]);

  async function handleAddToCart(variantId) {
    setAdding(true);

    const result = await applyCartLinesChange({
      type: 'addCartLine',
      merchandiseId: variantId,
      quantity: 1,
    });

    setAdding(false);

    if (result.type === 'error') {
      setShowError(true);
      console.error(result.message);
    }
  }

  async function handleRemoveFromCart(variantId) {
    setAdding(true);
    
    const cartLineId = findCartLineIdByVariantId(variantId);

    if (!cartLineId) {
      console.error("Cart line not found for variant:", variantId);
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

    const variantId = products[0]?.variants.nodes[0]?.id;

    if (isAdded) {
      handleRemoveFromCart(variantId);
    } else {
      handleAddToCart(variantId);
    }

    setIsAdded(!isAdded);
  }

  function findCartLineIdByVariantId(variantId) {
    const line = lines.find(line => line.merchandise.id === variantId);
    const shippingProtectionItem = lines.find(item =>
      item.merchandise.title.includes("Shipping Protection")
    )

    console.log(shippingProtectionItem, "SP Item")
    return line ? line.id : null;
  }

  async function fetchProducts() {
    setLoading(true);

    try {
      const { data } = await query<{products: {nodes: Node[]}}>(
        `query {
          products(first: 1, query: "title:'Shipping Protection'") {
            nodes {
              id
              title
              images(first:1){
                nodes {
                  url
                }
              }
              variants(first: 1) {
                nodes {
                  id
                  price {
                    amount
                  }
                }
              }
            }
          }
        }`
      );

      setProducts(data.products.nodes);
    } catch (error) {
      console.error(error, 'Error fetching products');
    } finally {
      setLoading(false);
    }
  }

  if (loading || (!loading && products.length === 0)) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(products);

  if (!productsOnOffer.length || market.handle !== 'us' || shippingAddress?.countryCode !== 'US') {
    return null;
  }

  return (
    <ProductOffer
      product={productsOnOffer[0]}
      i18n={i18n}
      adding={adding}
      addToCartHandlerButton={addToCartHandlerButton}
      isAdded={isAdded}
      showError={showError}
    />
  );
}

function getProductsOnOffer(products) {
return products;
}

function ProductOffer({product, i18n, adding, addToCartHandlerButton, showError, isAdded}) {
  const {images, title, variants} = product;
  const renderPrice = i18n.formatCurrency(variants.nodes[0].price.amount);
  const imageUrl =
    images.nodes[0]?.url ??
    'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081';

  return (
    <s-stack gap='base'>
      <s-stack gap="small-300" border='base' borderRadius='base' padding='base'>
        <s-grid
          gap='base'
          gridTemplateColumns="64px 1fr auto"
          alignItems='center'
        >
          <s-image
            border='base'
            borderWidth='base'
            borderRadius="base"
            src={imageUrl}
            aspectRatio="1/1"
          />

          <s-stack gap="none">
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-heading>
                {title}
              </s-heading>

              <s-link commandFor="shipping-protection-modal">
                <s-icon type="info"/>
              </s-link>

              <s-modal
                id="shipping-protection-modal"
                heading="Wigs.com Shipping Protection"
              >
                <s-stack gap="base">
                  <s-paragraph>
                    Guarantee your packages in the US by protecting them against loss, theft, or damage.
                  </s-paragraph>
                  <s-image
                    alt="Shipping Protection"
                    objectFit="contain"
                    inlineSize="auto"
                    src="https://cdn.shopify.com/s/files/1/1410/9094/files/shipping-protection-banner.jpg?v=1716401270"/>
                  <s-heading>Enhanced Protection from Life's Challenges</s-heading>
                  <s-stack
                    direction="inline"
                    gap="base"
                    alignItems="center"
                  >
                    <s-box maxInlineSize="84px">
                      <s-image src="https://cdn.shopify.com/s/files/1/1410/9094/files/Shipping_Protection_green.png?v=1717785024" inlineSize="auto"/>
                    </s-box>
                    <s-unordered-list>
                      <s-list-item>
                        <s-text type="strong"> Lost in transit</s-text>
                      </s-list-item>
                      <s-list-item>
                        <s-text type="strong"> Stolen from doorstep</s-text>
                      </s-list-item>
                      <s-list-item>
                        <s-text type="strong"> Damaged packages</s-text>
                      </s-list-item>
                    </s-unordered-list>
                  </s-stack>

                  <s-heading>What is Shipping Protection</s-heading>
                  <s-paragraph>
                    We want you to receive your piece in perfect condition, but sometimes things happen
                    to packages while in transit that can't be controlled. If you’re a customer in the
                    contiguous United States, you can add this layer of protection to make sure your
                    package is covered if it happens to get lost, stolen, or damaged. To help mitigate
                    these shipping issues, we provide enhanced protection to your order for a small fee
                    at the time of checkout. This fee covers the following shipping issues:
                  </s-paragraph>

                  <s-unordered-list>
                    <s-list-item>
                      <s-paragraph>
                          <s-text type="strong"> LOST:</s-text>
                          <s-text>
                            Packages presumed to be lost by the carrier where the status is not
                            'delivered'. Claims can be filed between 7 and 30 days from the date the
                            order was shipped.
                          </s-text>
                      </s-paragraph>
                    </s-list-item>
                    <s-list-item>
                      <s-paragraph>
                          <s-text type="strong"> STOLEN:</s-text>
                          <s-text>
                            Packages marked 'delivered' yet not received are considered stolen.
                            Claims can be filed between 5 and 15 days after the 'delivery
                            date'.
                          </s-text>
                      </s-paragraph>
                    </s-list-item>
                    <s-list-item>
                      <s-paragraph>
                        <s-text type="strong"> DAMAGED:</s-text>
                        <s-text>
                          A purchased product that is unusable due to damage incurred during
                          shipping is considered damaged. Claims can be filed within 15 days of
                          the delivery date.
                        </s-text>
                      </s-paragraph>
                    </s-list-item>
                  </s-unordered-list>
                </s-stack>
              </s-modal>
            </s-stack>
              
            <s-text tone="custom">{renderPrice}</s-text>
          </s-stack>

          <s-button
              variant='secondary'
              loading={adding}
              accessibilityLabel={`Add ${title} to cart`}
              onClick={() => addToCartHandlerButton(variants.nodes[0].id)}
          >
            {isAdded ? 'Remove' : "Add"}
          </s-button>
        </s-grid>
      </s-stack>

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
