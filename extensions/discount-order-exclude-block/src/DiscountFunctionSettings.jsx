
import "@shopify/ui-extensions/preact";
import {render } from "preact";
import {useState, useEffect, useMemo, useRef} from "preact/hooks";

export default async () => {
  render(<App />, document.body);
};

function CollectionsSection({
  collections,
  onClickRemove,
}) {
  if (collections.length === 0) {
    return null;
  }

  return collections.map(collection => (
    <s-stack
      direction="inline"
      alignItems="center"
      justifyContent="space-between"
      key={collection.id}
    >
      <s-link
        href={`shopify://admin/collections/${collection.id.split("/").pop()}`}
        target="_blank"
      >
        {collection.title}
      </s-link>
      <s-button variant="tertiary" onClick={() => onClickRemove(collection.id)}>
        <s-icon type="x-circle" />
      </s-button>
    </s-stack>
  ));
}

function App() {
  const {
    applyExtensionMetafieldChange,
    i18n,
    resetForm,
    initialPercentages,
    percentages,
    onPercentageValueChange,
    initialCollections,
    collections,
    onRemoveCollection,
    onSelectedCollections,
    loading,
    intialProductTags,
    productTags,
    onProductTagsChange,
    excludeClearance,
    onToggleExcludeClearance
  } = useExtensionData();

  const {discounts} = shopify;

  const [error, setError] = useState();

  const tagInputRef = useRef();
  
  const forceOrderDiscount = async () => {
    const result =
      await discounts?.updateDiscountClasses?.(['order']);

    if (!result.success) {
      setError(i18n.translate("error"));
    }

    if (result.success && error) {
      setError(undefined);
    }
  };

  const createTag = () => {
    if (!tagInputRef.current) {
      return;
    }

    onProductTagsChange(tagInputRef.current.value);

    tagInputRef.current.value = '';
  };

  useEffect(forceOrderDiscount, []);

  if (loading) {
    return <s-text>{i18n.translate("loading")}</s-text>;
  }

  return (
    <s-function-settings
      onSubmit={event => {
        event.waitUntil?.(applyExtensionMetafieldChange());
      }}
      onReset={resetForm}
    >
      <s-text>{i18n.translate("description")}</s-text>
      <s-section>
        <s-stack gap="base">
          {error ? <s-banner tone="critical">{error}</s-banner> : null}

          <s-box display="none">
            <s-text-field label="Tags" name="tags" labelAccessibilityVisibility="exclusive" defaultValue={intialProductTags} value={productTags} />
          </s-box>

          <s-box display="none">
            <s-text-field label="Collections" name="collections" labelAccessibilityVisibility="exclusive" defaultValue={initialCollections} value={collections} />
          </s-box>

          <s-stack gap="base">
            <s-number-field
              label={i18n.translate("discountPercentage")}
              name="order"
              value={String(percentages.order)}
              defaultValue={String(initialPercentages.order)}
              min={0}
              max={100}
              onChange={event =>
                onPercentageValueChange("order", event.currentTarget.value)
              }
              suffix="%"
            />
            
            <s-divider />

            <s-text>
              INCLUDE: Collections
            </s-text>

            <CollectionsSection collections={collections} onClickRemove={onRemoveCollection} />
            
            <s-box inlineSize="180px">
              <s-button onClick={onSelectedCollections} icon="plus-circle">
                {i18n.translate("collections.buttonLabel")}
              </s-button>
            </s-box>

            <s-divider />

            <s-text>EXCLUDE: Product tags</s-text>

            <s-stack direction="inline" gap="small-200" display={productTags.length ? 'auto' : 'none'}>
              {productTags.map((tag) => (
                <s-clickable-chip key={tag} color="base" removable onRemove={() => onProductTagsChange(tag)}>
                  {tag}
                </s-clickable-chip>
              ))}
            </s-stack>

            <s-stack gap="small-400">
              <s-text>Tag</s-text>

              <s-grid gridTemplateColumns="1fr auto" gap="base">
                <s-text-field label="Tag to Add" labelAccessibilityVisibility="exclusive" ref={tagInputRef} />
                <s-button onClick={createTag}>
                  Add
                </s-button>
              </s-grid>
            </s-stack>

            <s-divider />

            <s-banner heading="ATTENTION" tone="info">
              This discount will keep clearance active, regardless of clearance variant exclusion. If you want clearance to be turned off then use another discount method.
            </s-banner>

            <s-checkbox label="EXCLUDE: Clearance Variants" checked={excludeClearance} onChange={onToggleExcludeClearance} />
          </s-stack>
        </s-stack>
      </s-section>
    </s-function-settings>
  );
}

function useExtensionData() {
  const {applyMetafieldChange, i18n, data, resourcePicker, query} = shopify;

  const metafieldConfig = useMemo(
    () =>
      parseMetafield(
        data?.metafields?.find(
          metafield => metafield.key === "function-configuration",
        )?.value,
      ),
    [data?.metafields],
  );

  const [percentages, setPercentages] = useState(metafieldConfig.percentages);
  const [initialCollections, setInitialCollections] = useState(
    [],
  );
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);

  const [productTags, setProductTags] = useState(metafieldConfig.productTags);
  const [excludeClearance, setExcludeClearance] = useState(metafieldConfig.excludeClearance);

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      const selectedCollections = await getCollections(
        metafieldConfig.collectionIds,
        query,
      );
      setInitialCollections(selectedCollections);
      setCollections(selectedCollections);
      setLoading(false);
    };
    fetchCollections();
  }, [metafieldConfig.collectionIds, query]);

  const onPercentageValueChange = async (type, value) => {
    setPercentages(prev => ({
      ...prev,
      [type]: Number(value),
    }));
  };

  async function applyExtensionMetafieldChange() {
    await applyMetafieldChange({
      type: "updateMetafield",
      namespace: "b-h-discounts",
      key: "function-configuration",
      value: JSON.stringify({
        orderPercentage: percentages.order,
        collectionIds: collections.map(({id}) => id),
        productTags,
        excludeClearance
      }),
      valueType: "json",
    });
    setInitialCollections(collections);
  }

  const resetForm = () => {
    setPercentages(metafieldConfig.percentages);
    setCollections(initialCollections);
    setProductTags(metafieldConfig.productTags);
    setExcludeClearance(metafieldConfig.excludeClearance);
  };

  const onSelectedCollections = async () => {
    const selection = await resourcePicker({
      type: "collection",
      selectionIds: collections.map(({id}) => ({id})),
      action: "select",
      multiple: true,
      filter: {
        archived: true,
        variants: true,
      },
    });
    setCollections(selection ?? []);
  };

  const onRemoveCollection = (id) => {
    setCollections(prev => prev.filter(collection => collection.id !== id));
  };

  const onProductTagsChange = (value) => {
    if (productTags.includes(value)) {
      setProductTags((prev) => ([...prev.filter((tag) => tag !== value)]));
    }
    else {
      setProductTags((prev) => ([...prev, value]));
    }
  };


  const onToggleExcludeClearance = () => setExcludeClearance((prev) => !prev);

  return {
    applyExtensionMetafieldChange,
    i18n,
    resetForm,
    initialPercentages: metafieldConfig.percentages,
    percentages,
    onPercentageValueChange,
    initialCollections,
    collections,
    onRemoveCollection,
    onSelectedCollections,
    loading,
    intialProductTags: metafieldConfig.productTags,
    productTags,
    onProductTagsChange,
    excludeClearance,
    onToggleExcludeClearance
  };
}

function parseMetafield(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      percentages: {
        order: Number(parsed.orderPercentage ?? 0),
      },
      collectionIds: parsed.collectionIds ?? [],
      productTags: parsed.productTags ?? [],
      excludeClearance: parsed.excludeClearance ?? true
    };
  } catch {
    return {
      percentages: {order: 0},
      collectionIds: [],
      productTags: [],
      excludeClearance: true
    };
  }
}

async function getCollections(
  collectionGids,
  adminApiQuery,
) {
  const query = `#graphql
    query GetCollections($ids: [ID!]!) {
      collections: nodes(ids: $ids) {
        ... on Collection {
          id
          title
        }
      }
    }
  `;
  const result = await adminApiQuery(
    query,
    {variables: {ids: collectionGids}},
  );
  return result?.data?.collections ?? [];
}


