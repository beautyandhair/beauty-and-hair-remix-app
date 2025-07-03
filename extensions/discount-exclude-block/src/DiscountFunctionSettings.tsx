import {
  reactExtension,
  useApi,
  BlockStack,
  FunctionSettings,
  Section,
  Text,
  Form,
  NumberField,
  Box,
  TextField,
  InlineStack,
  Button,
  Icon,
  Link,
  Divider,
  ProgressIndicator,
  Pressable,
  Badge,
  Checkbox,
  Banner
} from '@shopify/ui-extensions-react/admin';

import { useState, useEffect, useMemo } from 'react';

const TARGET = 'admin.discount-details.function-settings.render';

export default reactExtension(TARGET, async (api) => {
  const existingDefinition = await getMetafieldDefinition(api.query);
  if (!existingDefinition) {
    // Create a metafield definition for persistence if no pre-existing definition exists
    const metafieldDefinition = await createMetafieldDefinition(api.query);

    if (!metafieldDefinition) {
      throw new Error('Failed to create metafield definition');
    }
  }
  return <App />;
});

function PercentageField({ defaultValue, value, onChange, i18n }) {
  return (
    <Box>
      <BlockStack gap="base">
        <Text fontWeight="bold">
          {i18n.translate('description')}
        </Text>
        <NumberField
          label={i18n.translate('discountPercentage')}
          name="percentage"
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          suffix="%"
        />
      </BlockStack>
    </Box>
  );
}

function ExcludeClearanceCheckbox({
  excludeClearance,
  onChange,
} : {excludeClearance: boolean, onChange: (value: boolean) => void}) {

  return (
    <Box>
      <BlockStack gap="base">
        <Banner title="ATTENTION" tone="info">
          <Text>This discount will keep clearance active, regardless of clearance variant exclusion. If you want clearance to be turned off then use another discount method.</Text>
        </Banner>
        <Checkbox
          checked={excludeClearance}
          onChange={onChange}
        >
          <Text fontWeight="bold">EXCLUDE: Clearance Variants</Text>
        </Checkbox>
    </BlockStack>
  </Box>
  );
}

function ProductTagsField({ defaultValue, value, onChange }) {
  return (
    <Box display="none">
      <TextField
        label=""
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      />
    </Box>
  );
}

function ProductTagsBlock({
  productTags,
  onChange
} : {productTags: string[], initialProductTags: string[], onChange: (value: string) => void}) {
  const [newTag, setNewTag] = useState('');

  const onAddTag = () => {
    onChange(newTag);
    setNewTag('');
  };

  return (
    <Box>
      <BlockStack gap="base">
        <Text fontWeight="bold">
          EXCLUDE: Product tags
        </Text>
        <InlineStack gap={true} columnGap="base" rowGap="base" blockGap="base" inlineGap="base">
          {productTags.map((tag) => (
            <Pressable onClick={() => onChange(tag)}>
              <Badge icon="CircleCancelMinor" iconPosition="end">
                {tag}
              </Badge>
            </Pressable>
          ))}
        </InlineStack>
        <InlineStack gap="large" blockAlignment="end">
          <TextField label="Tag" value={newTag} onChange={(value) => setNewTag(value)} />
          <Button onClick={onAddTag}>
            <InlineStack
              blockAlignment="center"
              gap="base"
            >
              <Icon name="CirclePlusMinor" />
              Add
            </InlineStack>
          </Button>
        </InlineStack>
    </BlockStack>
  </Box>
  );
}

function CollectionsField({ defaultValue, value, onChange }) {
  return (
    <Box display="none">
      <TextField
        label=""
        defaultValue={defaultValue}
        value={value.map((collection) => collection.id)}
        onChange={onChange}
      />
    </Box>
  );
}

function CollectionsSection({
  i18n,
  loading,
  onClickAdd,
  onClickRemove,
  selectedCollections,
}) {
  const collectionRows =
    selectedCollections && selectedCollections.length > 0
      ? selectedCollections.map((collection) => (
          <BlockStack gap="base" key={collection.id}>
            <InlineStack
              blockAlignment="center"
              inlineAlignment="space-between"
            >
              <Link
                href={`shopify://admin/collections/${collection.id
                  .split('/')
                  .pop()}`}
                tone="inherit"
                target="_blank"
              >
                {collection.title}
              </Link>
              <Button
                variant="tertiary"
                onClick={() => onClickRemove(collection.id)}
              >
                <Icon name="CircleCancelMinor" />
              </Button>
            </InlineStack>
          </BlockStack>
        ))
      : null;
  return (
    <Section>
      <BlockStack gap="base">
        {loading ? (
          <InlineStack gap inlineAlignment="center" padding="base">
            <ProgressIndicator size="base" />
          </InlineStack>
        ) : null}

        {collectionRows}
        <Button onClick={onClickAdd}>
          <InlineStack
            blockAlignment="center"
            inlineAlignment="start"
            gap="base"
          >
            <Icon name="CirclePlusMinor" />
            {i18n.translate('addCollections')}
          </InlineStack>
        </Button>
      </BlockStack>
    </Section>
  );
}

function App() {
  const {
    loading,
    applyExtensionMetafieldChange,
    i18n,
    initialPercentage,
    onPercentageValueChange,
    percentage,
    initialSelectedCollections,
    onProductTagsChange,
    productTags,
    initialProductTags,
    onSelectCollections,
    handleRemoveCollection,
    selectedCollections,
    excludeClearance,
    onExcludeClearanceChange,
    resetForm
  } = useExtensionData();

  return (
    <FunctionSettings onSave={applyExtensionMetafieldChange}>
    <Form onReset={resetForm} onSubmit={undefined}>
      <BlockStack gap="large">
        <Section>
          <ProductTagsField
              defaultValue={initialProductTags}
              value={productTags}
              onChange={onProductTagsChange}
            />
          <CollectionsField
            defaultValue={initialSelectedCollections}
            value={selectedCollections}
            onChange={onSelectCollections}
          />
          <PercentageField
            value={percentage}
            defaultValue={initialPercentage}
            onChange={onPercentageValueChange}
            i18n={i18n}
          />
        </Section>
        <Divider />

        <Section>
          <Box>
            <BlockStack gap="base">
              <Text fontWeight="bold">
                INCLUDE: Collections
              </Text>
              <CollectionsSection
                loading={loading}
                selectedCollections={selectedCollections}
                onClickAdd={onSelectCollections}
                onClickRemove={handleRemoveCollection}
                i18n={i18n}
              />
            </BlockStack>
          </Box>
        </Section>
        <Divider />

        <Section>
          <ProductTagsBlock productTags={productTags} initialProductTags={initialProductTags} onChange={onProductTagsChange} />
        </Section>
        <Divider />

        <Section>
          <ExcludeClearanceCheckbox excludeClearance={excludeClearance} onChange={onExcludeClearanceChange} />
        </Section>
      </BlockStack>
    </Form>
    </FunctionSettings>
  );
}

function useExtensionData() {
  const { applyMetafieldChange, i18n, data, resourcePicker, query } = useApi(TARGET);
  const initialMetafields = data?.metafields || [];
  const [loading, setLoading] = useState(false);
  const [savedMetafields] = useState(initialMetafields);

  const [percentage, setPercentage] = useState(0);
  const [initialPercentage, setInitialPercentage] = useState(0);

  const [excludeClearance, setExcludeClearance] = useState<boolean>(true);
  const [initialExcludeClearance, setInitialExcludeClearance] = useState(true);

  const [productTags, setProductTags] = useState<string[]>([]);
  const [initialProductTags, setInitialProductTags] = useState([]);

  const [selectedCollections, setSelectedCollections] = useState([]);
  const [initialCollectionIds, setInitialCollectionIds] = useState([]);
  const [initialSelectedCollections, setInitialSelectedCollections] = useState([]);

  useEffect(() => {
    async function fetchInitialData() {
      setLoading(true);

      const parsedConfigMetafield = savedMetafields.find(
        (metafield) => metafield.key === 'function-configuration'
      );

      const savedMetafieldsValue = parsedConfigMetafield ? JSON.parse(parsedConfigMetafield.value) : {
        percentage: 0,
        collections: [],
        productTags: [],
        excludeClearance: true
      };

      const transferPercentage = parsePercentage(savedMetafieldsValue);
      setInitialPercentage(Number(transferPercentage));
      setPercentage(Number(transferPercentage));

      const transferExcludeClearance = parseExcludeClearance(savedMetafieldsValue);
      setInitialExcludeClearance(transferExcludeClearance);
      setExcludeClearance(transferExcludeClearance);

      const transferProductTags = parseProductTags(savedMetafieldsValue);
      setInitialProductTags(transferProductTags);
      setProductTags(transferProductTags);

      const transferIncludedCollectionIds =
      parseTransferIncludedCollectionIds(
          savedMetafields.find(
            (metafield) => metafield.key === 'function-configuration'
          )?.value
        );
      setInitialCollectionIds(transferIncludedCollectionIds);

      await getCollectionTitles(transferIncludedCollectionIds, query).then(
        (results) => {
          const collections = results.data.nodes.map((collection) => ({
            id: collection.id,
            title: collection.title,
          }));
          setSelectedCollections(collections);
          setInitialSelectedCollections(collections);
          return;
        }
      );

      setLoading(false);
    }
    fetchInitialData();
  }, [initialMetafields]);

  const onPercentageValueChange = async (value) => {
    setPercentage(Number(value));
  };

  const onExcludeClearanceChange = async (value) => {
    setExcludeClearance(value);
  };

  const onProductTagsChange = (value: string) => {
    if (productTags.includes(value)) {
      setProductTags((prev) => [...prev.filter((tag) => tag !== value)]);
    }
    else {
      setProductTags((prev) => [...prev, value]);
    }
  };

  async function onSelectCollections() {
    const selection = await resourcePicker({
      type: 'collection',
      selectionIds: selectedCollections.map((collection) => ({
        id: collection.id,
      })),
      action: 'select'
    });

    if (selection != undefined) {
      setSelectedCollections(selection);
    }
  }

  async function handleRemoveCollection(id) {
    const updatedCollections = selectedCollections.filter(
      (collection) => collection.id !== id
    );
    setSelectedCollections(updatedCollections);
  }

  async function applyExtensionMetafieldChange() {
    if (!percentage) {
      return Promise.reject(new Error("You need to include a discount percentage greater than 0."));
    }
    else if (!selectedCollections.length) {
      return Promise.reject(new Error("You need to choose at least one collection."));
    }

    const commitFormValues = {
      percentage: Number(percentage),
      collections: selectedCollections.map((collection) => collection.id),
      productTags,
      excludeClearance
    };
    
    await applyMetafieldChange({
      type: 'updateMetafield',
      namespace: '$app:discount-exclude',
      key: 'function-configuration',
      value: JSON.stringify(commitFormValues),
      valueType: 'json',
    });
  }

  return {
    loading,
    applyExtensionMetafieldChange,
    i18n,
    initialPercentage,
    onPercentageValueChange,
    percentage,
    initialSelectedCollections: initialCollectionIds,
    onProductTagsChange,
    productTags,
    initialProductTags,
    onSelectCollections,
    handleRemoveCollection,
    selectedCollections,
    excludeClearance,
    onExcludeClearanceChange,
    resetForm: () => {
      setPercentage(initialPercentage);
      setSelectedCollections(initialSelectedCollections);
      setProductTags(initialProductTags);
      setExcludeClearance(initialExcludeClearance);
    }
  };
}

const METAFIELD_NAMESPACE = '$app:discount-exclude';
const METAFIELD_KEY = 'function-configuration';
async function getMetafieldDefinition(adminApiQuery) {
  const query = `#graphql
    query GetMetafieldDefinition {
      metafieldDefinitions(first: 1, ownerType: DISCOUNT, namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
        nodes {
          id
        }
      }
    }
  `;

  const result = await adminApiQuery(query);

  return result?.data?.metafieldDefinitions?.nodes[0];
}
async function createMetafieldDefinition(adminApiQuery) {
  const definition = {
    access: {
      admin: 'MERCHANT_READ_WRITE',
    },
    key: METAFIELD_KEY,
    name: 'Discount Configuration',
    namespace: METAFIELD_NAMESPACE,
    ownerType: 'DISCOUNT',
    type: 'json',
  };

  const query = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
            id
          }
        }
      }
  `;

  const variables = { definition };
  const result = await adminApiQuery(query, { variables });

  return result?.data?.metafieldDefinitionCreate?.createdDefinition;
}

/* Utility Functions */

function parsePercentage(parsedObject) {
  try {
    return parsedObject.percentage;
  } catch {
    return 0;
  }
}

function parseExcludeClearance(parsedObject) {
  try {
    return parsedObject.excludeClearance;
  } catch {
    return true;
  }
}

function parseProductTags(parsedObject) {
  try {
    return parsedObject.productTags;
  } catch {
    return [];
  }
}

async function getCollectionTitles(collectionGids, adminApiQuery) {
  return adminApiQuery(`
    {
      nodes(ids: ${JSON.stringify(collectionGids)}) {
        ... on Collection {
          id
          title
          description
        }
      }
    }
  `);
}

function parseTransferIncludedCollectionIds(value) {
  try {
    return JSON.parse(value).collections;
  } catch {
    return [];
  }
}
