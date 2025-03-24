
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
  Paragraph,
  ProgressIndicator,
  Pressable,
  Badge,
} from '@shopify/ui-extensions-react/admin';

import { useState, useEffect } from 'react';

interface Metafield {
  namespace: string,
  key: string,
  value: string
}

const TARGET = 'admin.discount-details.function-settings.render';
const EMPTY_METAFIELD_OBJECT = {
  namespace: '',
  key: '',
  value: ''
};

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

function VariantMetafieldBlock({
  variantMetafield,
  initialVariantMetafield,
  onChange
} : {variantMetafield: Metafield, initialVariantMetafield: Metafield, onChange: (fieldType: string, value: string) => void}) {
  return (
    <Box>
      <BlockStack gap="base">
        <Box>
          <Text fontWeight="bold">
            Product variants with this metafield will be excluded.
          </Text>
          <Paragraph>
            The "key" field is required, but leave "value" blank if it should be ignored.
          </Paragraph>
        </Box>
        <InlineStack gap="large">
          <TextField label="Namespace" defaultValue={initialVariantMetafield.namespace} value={variantMetafield.namespace} onChange={(value) => onChange("namespace", value)} />
          <TextField label="Key" value={variantMetafield.key} defaultValue={initialVariantMetafield.key} onChange={(value) => onChange("key", value)} />
          <TextField label="Value" value={variantMetafield.value} defaultValue={initialVariantMetafield.value} onChange={(value) => onChange("value", value)} />
        </InlineStack>
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
          Products with these tags will be excluded.
        </Text>
        <InlineStack gap="base">
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
    initialVariantMetafield,
    onVariantMetafieldChange,
    variantMetafield,
    initialSelectedCollections,
    onProductTagsChange,
    productTags,
    initialProductTags,
    onSelectCollections,
    handleRemoveCollection,
    selectedCollections,
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
          <VariantMetafieldBlock variantMetafield={variantMetafield} initialVariantMetafield={initialVariantMetafield} onChange={onVariantMetafieldChange} />
        </Section>
        <Divider />
        <Section>
          <ProductTagsBlock productTags={productTags} initialProductTags={initialProductTags} onChange={onProductTagsChange} />
        </Section>
        <Divider />
        <Section>
          <Box>
            <BlockStack gap="base">
              <Text fontWeight="bold">
                Products in these collections will be excluded.
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

  const [variantMetafield, setVariantMetafield] = useState<Metafield>(EMPTY_METAFIELD_OBJECT);
  const [initialVariantMetafield, setInitialVariantMetafield] = useState(EMPTY_METAFIELD_OBJECT);

  const [productTags, setProductTags] = useState<string[]>([]);
  const [initialProductTags, setInitialProductTags] = useState([]);

  const [selectedCollections, setSelectedCollections] = useState([]);
  const [initialCollectionIds, setInitialCollectionIds] = useState([]);
  const [initialSelectedCollections, setInitialSelectedCollections] = useState(
    []
  );

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
        ...EMPTY_METAFIELD_OBJECT
      };

      const transferPercentage = parsePercentage(savedMetafieldsValue);
      setInitialPercentage(Number(transferPercentage));
      setPercentage(Number(transferPercentage));

      const transferVariantMetafield = parseVariantMetafield(savedMetafieldsValue);
      setInitialVariantMetafield(transferVariantMetafield);
      setVariantMetafield(transferVariantMetafield);

      const transferProductTags = parseProductTags(savedMetafieldsValue);
      setInitialProductTags(transferProductTags);
      setProductTags(transferProductTags);

      const transferExcludedCollectionIds =
      parseTransferExcludedCollectionIds(
          savedMetafields.find(
            (metafield) => metafield.key === 'function-configuration'
          )?.value
        );
      setInitialCollectionIds(transferExcludedCollectionIds);

      await getCollectionTitles(transferExcludedCollectionIds, query).then(
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

  const onVariantMetafieldChange = (fieldType: string, value: string) => {
    variantMetafield[fieldType] = value;

    setVariantMetafield((prev) => ({...prev}));
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
      action: 'select',
      filter: {
        archived: true,
        variants: true,
      },
    });
    setSelectedCollections(selection);
  }

  async function handleRemoveCollection(id) {
    const updatedCollections = selectedCollections.filter(
      (collection) => collection.id !== id
    );
    setSelectedCollections(updatedCollections);
  }

  async function applyExtensionMetafieldChange() {
    const commitFormValues = {
      percentage: Number(percentage),
      collections: selectedCollections.map((collection) => collection.id),
      productTags,
      ...variantMetafield
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
    initialVariantMetafield,
    onVariantMetafieldChange,
    variantMetafield,
    initialSelectedCollections: initialCollectionIds,
    onProductTagsChange,
    productTags,
    initialProductTags,
    onSelectCollections,
    handleRemoveCollection,
    selectedCollections,
    resetForm: () => {
      setPercentage(initialPercentage);
      setVariantMetafield(initialVariantMetafield);
      setSelectedCollections(initialSelectedCollections);
      setProductTags(initialProductTags);
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

function parseVariantMetafield(parsedObject) {
  try {
    return ({
      namespace: parsedObject.namespace,
      key: parsedObject.key,
      value: parsedObject.value
    });
  } catch {
    return {...EMPTY_METAFIELD_OBJECT};
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

function parseTransferExcludedCollectionIds(value) {
  try {
    return JSON.parse(value).collections;
  } catch {
    return [];
  }
}
