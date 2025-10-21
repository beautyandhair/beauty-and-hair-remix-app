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
  InlineStack,
  useCartLines,
  useApplyCartLinesChange,
  useApi,
  useSettings,
  useLocalizationCountry,
} from "@shopify/ui-extensions-react/checkout";

// 1. Choose an extension target
export default reactExtension("purchase.checkout.block.render", () => (
  <Extension />
));

function Extension() {
  const {query, i18n} = useApi();

  const country = useLocalizationCountry();
  const applyCartLinesChange = useApplyCartLinesChange();

  const [product, setProduct] = useState<{title: string, description: string, imageSrc: string, price: number}>();
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const lines = useCartLines();
  const {
    product_gid,
    product_title
  } = useSettings();

  useEffect(() => {
    fetchProduct();
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

      setProduct({
        title: data.products.nodes[0].title,
        description: data.products.nodes[0].description,
        imageSrc: data.products.nodes[0].images.nodes[0].url,
        price: data.products.nodes[0].variants.nodes[0].price.amount
      });
    } catch (error) {
      console.error(error, 'Error fetching product');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton/>;
  }

  if (!loading && !product) {
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

function ProductCard({product, i18n, adding, addToCartHandlerButton, showError, isAdded}) {
  const { imageSrc, description, title, price} = product;
  const renderPrice = i18n.formatCurrency(price);

  return (
    <BlockStack spacing='base'>
      <BlockStack spacing='loose' border="base" padding="base" borderRadius="base">
        <InlineLayout
          spacing='base'
          columns={[64, 'fill', 'auto']}
          blockAlignment='center'
        >
          <Image
            borderWidth='base'
            borderRadius='loose'
            source={imageSrc}
            aspectRatio={1}
            cornerRadius="base"
          />

          <BlockStack spacing='none'>
            <InlineStack spacing="tight">
              <Heading level={2}>
                {title}
              </Heading>
            </InlineStack>

            <Text>
              {description}
            </Text>
              
            <Text appearance="decorative">{renderPrice}</Text>
          </BlockStack>

          <Button
              kind="primary"
              loading={adding}
              accessibilityLabel={`Add ${title} to cart`}
              onPress={addToCartHandlerButton}
              appearance="monochrome"
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
