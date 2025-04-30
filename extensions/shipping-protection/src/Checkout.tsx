import {useEffect, useState} from "react";
import {
  reactExtension,
  Divider,
  Image,
  Banner,
  Heading,
  Button,
  InlineLayout,
  BlockStack,
  Text,
  SkeletonText,
  SkeletonImage,
  Link,
  Modal,
  TextBlock,
  Icon,
  InlineStack,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  List,
  ListItem,
  useShippingAddress
} from "@shopify/ui-extensions-react/checkout";

import type {
  Market
} from '@shopify/ui-extensions/checkout';

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const {query, i18n} = useApi();
  const applyCartLinesChange = useApplyCartLinesChange();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const lines = useCartLines();
  const [isAdded, setIsAdded] = useState(false);

  const { localization } = useApi();
  const [market, setMarket] = useState<Market>(localization.market.current);
  const address = useShippingAddress();

  useEffect(() => {
    localization.market.subscribe(setMarket);
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
    if ((market.handle !== 'us' || address.countryCode !== 'US') && isAdded) {
      const variantId = products[0]?.variants.nodes[0]?.id;
      handleRemoveFromCart(variantId);
      setIsAdded(false);
    }
  }, [market.handle, address.countryCode]);

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

  if (loading) {
    return <LoadingSkeleton/>;
  }

  if (!loading && products.length === 0) {
    return null;
  }

  const productsOnOffer = getProductsOnOffer(products);

  if (!productsOnOffer.length) {
    return null;
  }

  if (market.handle !== 'us' || address.countryCode !== 'US') {
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


function LoadingSkeleton() {
  return (
    <BlockStack spacing='loose'>
      <Divider/>
      <Heading level={2}>Protect Your Package</Heading>

      <BlockStack spacing='loose'>
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <SkeletonImage aspectRatio={1}/>
          <BlockStack spacing='none'>
            <SkeletonText inlineSize='large'/>
            <SkeletonText inlineSize='small'/>
          </BlockStack>
          <Button kind='secondary' disabled={true}>
            Add
          </Button>
        </InlineLayout>
      </BlockStack>
    </BlockStack>
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
    <BlockStack spacing='base'>
      <Divider/>

      <BlockStack spacing='loose'>
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <Image
            border='base'
            borderWidth='base'
            borderRadius='loose'
            source={imageUrl}
            aspectRatio={1}
            cornerRadius="base"
          />

          <BlockStack spacing='none'>
            <InlineStack spacing="tight">
              <Heading level={2}>
                {title}
              </Heading>

              <Link
                overlay={
                  <Modal
                    id="shipping-protection-modal"
                    padding
                    title="Wigs.com Shipping Protection"
                  >
                    <BlockStack spacing="loose">
                      <TextBlock>
                        Guarantee your packages in the US by protecting them against loss, theft, or damage.
                      </TextBlock>
                      <Image
                        accessibilityDescription="Shipping Protection"
                        fit="contain"
                        source="https://cdn.shopify.com/s/files/1/1410/9094/files/shipping-protection-banner.jpg?v=1716401270"/>
                      <Heading level={3}>Enhanced Protection from Life's Challenges</Heading>
                      <InlineLayout
                        columns={['30%', 'fill']}
                        spacing="loose"
                        blockAlignment="center"
                      >
                        <Image
                          source="https://cdn.shopify.com/s/files/1/1410/9094/files/Shipping_Protection_green.png?v=1717785024"/>
                        <List>
                          <ListItem>
                            <Text emphasis="bold"> Lost in transit</Text>
                          </ListItem>
                          <ListItem>
                            <Text emphasis="bold"> Stolen from doorstep</Text>
                          </ListItem>
                          <ListItem>
                            <Text emphasis="bold"> Damaged packages</Text>
                          </ListItem>
                        </List>
                      </InlineLayout>

                      <Heading level={3}>What is Shipping Protection</Heading>
                      <TextBlock>
                        We want you to receive your piece in perfect condition, but sometimes things happen
                        to packages while in transit that can't be controlled. If you’re a customer in the
                        contiguous United States, you can add this layer of protection to make sure your
                        package is covered if it happens to get lost, stolen, or damaged. To help mitigate
                        these shipping issues, we provide enhanced protection to your order for a small fee
                        at the time of checkout. This fee covers the following shipping issues:
                      </TextBlock>
                      <List>
                        <ListItem>
                          <TextBlock>
                              <Text emphasis="bold"> LOST:</Text>
                              <Text>
                                Packages presumed to be lost by the carrier where the status is not
                                'delivered'. Claims can be filed between 7 and 30 days from the date the
                                order was shipped.
                              </Text>
                          </TextBlock>
                        </ListItem>
                        <ListItem>
                          <TextBlock>
                              <Text emphasis="bold"> STOLEN:</Text>
                              <Text>
                                Packages marked 'delivered' yet not received are considered stolen.
                                Claims can be filed between 5 and 15 days after the 'delivery
                                date'.
                              </Text>
                          </TextBlock>
                        </ListItem>
                        <ListItem>
                          <TextBlock>
                            <Text emphasis="bold"> DAMAGED:</Text>
                            <Text>
                              A purchased product that is unusable due to damage incurred during
                              shipping is considered damaged. Claims can be filed within 15 days of
                              the delivery date.
                            </Text>
                          </TextBlock>
                        </ListItem>
                      </List>
                    </BlockStack>
                  </Modal>
                }
              >
                <Icon source="info"/>
              </Link>
            </InlineStack>
              
            <Text appearance='subdued'>{renderPrice}</Text>
          </BlockStack>

          <Button
              kind='secondary'
              loading={adding}
              accessibilityLabel={`Add ${title} to cart`}
              onPress={() => addToCartHandlerButton(variants.nodes[0].id)}
          >
            {isAdded ? 'Remove' : "Add"}
          </Button>
        </InlineLayout>
      </BlockStack>

      {showError && <ErrorBanner/>}
    </BlockStack>
  );
}

function ErrorBanner() {
  return (
    <Banner status='critical'>
      There was an issue adding this product. Please try again.
    </Banner>
  );
}
