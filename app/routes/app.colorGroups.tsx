import {
  Page,
  Card, 
  Tabs,
  TabProps,
  TextField,
  Button,
  InlineGrid,
  Box,
  Divider,
  BlockStack,
  IndexTable,
  Text,
  InlineStack,
  DropZone,
  Thumbnail,
  Combobox,
  Icon,
  Listbox,
  Tag,
  Spinner
} from '@shopify/polaris';
import { CheckIcon, DeleteIcon, EditIcon, SearchIcon, XIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SubmitFunction,
  useActionData,
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import {
  Vendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  validateVendor
} from "../models/Vendor.server";

import {
  VendorColor,
  VendorColorUpdate,
  createVendorColor,
  updateVendorColor,
  deleteVendorColor,
  stageColorImage,
  uploadColorImage,
  validateVendorColor
} from "../models/VendorColor.server";

import { authenticate } from 'app/shopify.server';

enum Action {
  CreateVendor = "CreateVendor",
  UpdateVendor = "UpdateVendor",
  DeleteVendor = "DeleteVendor",
  CreateVendorColor = "CreateVendorColor",
  UpdateVendorColor = "UpdateVendorColor",
  DeleteVendorColor = "DeleteVendorColor",
  StageColorImage = "StageColorImage",
  UploadColorImage = "UploadColorImage"
}

const COLOR_GROUPS = [
  {value: 'brunettes', label: 'Brunettes'},
  {value: 'blondes', label: 'Blondes'},
  {value: 'blacks', label: 'Blacks'},
  {value: 'grays', label: 'Grays'},
  {value: 'reds', label: 'Reds'},
  {value: 'new_colors', label: 'New Colors'},
  {value: 'best_sellers', label: 'Best Sellers'},
  {value: 'fashion-color', label: 'Fashion Color'},
  {value: 'exclusive-color', label: 'Exclusive Color'},
];

export async function loader() {
  return Response.json(await getVendors());
}

export async function action({ request }: {request: Request }) {
  const { admin, session } = await authenticate.admin(request);
  const data: any = {
    ...Object.fromEntries(await request.formData()),
  };

  switch (data.actionType) {
    case Action.CreateVendor:
      return await createVendor(data.vendorName);
    case Action.UpdateVendor:
      return await updateVendor(data.vendorName, JSON.parse(data.vendorUpdate));
    case Action.DeleteVendor:
      return await deleteVendor(data.vendorName);
    case Action.CreateVendorColor:
      return await createVendorColor(data.vendorName, data.color, JSON.parse(data.groups));
    case Action.UpdateVendorColor:
      return await updateVendorColor(data.vendorName, data.color, JSON.parse(data.vendorColorUpdate));
    case Action.DeleteVendorColor:
      return await deleteVendorColor(data.vendorName, data.color);
    case Action.StageColorImage:
      const stagedTargetResponse = await stageColorImage(admin.graphql, JSON.parse(data.file));

      return ({...stagedTargetResponse, color: data.color});
    case Action.UploadColorImage:
      const { shop } = session;

      return await uploadColorImage(admin.graphql, data.resourceUrl, data.color, shop);
  }

  return Response.json({ errors: ['Invalid data passed.'] }, { status: 422 });
}

export default function ColorGroups() {
  const submit = useSubmit();

  const [vendors, setVendors] = useState<Vendor[]>(useLoaderData<Vendor[]>() ?? []);
  const [selected, setSelected] = useState(0);

  const vendorTabs = useMemo(() => vendors?.length ? vendors.map((vendor) => vendor.name) : [], [vendors]);
  const currentVendor = useMemo(() => vendors[selected], [vendors, selected]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /* MUTATE VENDORS */

  const onCreateVendor = useCallback(async (value: string) => {
    await sleep(500);

    submit({
      actionType: Action.CreateVendor,
      vendorName: value
    }, { method: "POST" });

    setVendors((prev) => [...prev, { name: value, colors: [] }]);

    return true;
  }, []);

  const onUpdateVendor = useCallback(async (value: string) => {
    await sleep(1);

    submit({
      actionType: Action.UpdateVendor,
      vendorName: currentVendor.name,
      vendorUpdate: JSON.stringify({ name: value })
    }, { method: "PUT" });

    currentVendor.name = value;
    setVendors((prev) => [...prev]);

    return true;
  }, [currentVendor]);

  const onDeleteVendor = useCallback(async () => {
    await sleep(1);

    submit({
      actionType: Action.DeleteVendor,
      vendorName: currentVendor.name
    }, { method: "DELETE" });

    setVendors((prev) => prev.filter((vendor) => vendor.name !== currentVendor.name));
    setSelected(0);

    return true;
  }, [currentVendor]);

  /* MUTATE VENDOR COLORS */

  const onAddVendorColor = useCallback(async (color: string, groups: string[]) => {
    const colorData = {
      vendorName: currentVendor.name,
      color,
      groups,
      shopImageIds: {}
    };

    if (currentVendor.colors) {
      currentVendor.colors = [...currentVendor.colors, {...colorData}];
    }
    else {
      currentVendor.colors = [{...colorData}];
    }

    await sleep(1);
    submit({
      actionType: Action.CreateVendorColor,
      vendorName: currentVendor.name,
      color,
      groups: JSON.stringify(groups)
    }, { method: "POST" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  const onUpdateVendorColor = useCallback(async (color: string, vendorColorUpdate: VendorColorUpdate) => {
    const vendorColor = currentVendor.colors?.find((vendorColor) => vendorColor.color === color);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.groups = vendorColorUpdate.groups ?? vendorColor.groups;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.shopImageIds = vendorColorUpdate.shopImageIds ?? vendorColor.shopImageIds;
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.UpdateVendorColor,
      vendorName: currentVendor.name,
      color,
      vendorColorUpdate: JSON.stringify(vendorColorUpdate)
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  const onDeleteVendorColor = useCallback((color: string) => async () => {
    if (currentVendor.colors && currentVendor.colors) {
      currentVendor.colors = currentVendor.colors.filter((vendorColor) => vendorColor.color != color);
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.DeleteVendorColor,
      vendorName: currentVendor.name,
      color
    }, { method: "DELETE" });

    setVendors((prev) => [...prev]);
  }, [currentVendor]);

  /* OTHER FUNCTIONALITY */

  const tabs: TabProps[] = vendorTabs.map((vendorTab, index) => ({
    content: vendorTab,
    index,
    onAction: () => {},
    id: `${vendorTab}-${index}`,
    actions:
      [
        {
          type: 'rename',
          onAction: () => {},
          onPrimaryAction: onUpdateVendor
        },
        {
          type: 'delete',
          onPrimaryAction: onDeleteVendor,
        },
      ],
  }));

  return (
    <Page title="Color Groups">
      <Card>
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={onCreateVendor}
        >
          <BlockStack gap="600">
            <VendorColorForm onAddVendorColor={onAddVendorColor} />
            <Divider />
            <ColorGroupTable
              currentVendor={currentVendor}
              onDeleteVendorColor={onDeleteVendorColor}
              onUpdateVendorColor={onUpdateVendorColor}
              submit={submit}
            />
          </BlockStack>
        </Tabs>
      </Card>
    </Page>
  );
}

function MultiSelectGroups({ selectedGroups, onChangeSelectedGroups, hideSelect = false }: {
  selectedGroups: string[],
  onChangeSelectedGroups: (values: string[]) => void,
  hideSelect: boolean
}) {
  const [options, setOptions] = useState(COLOR_GROUPS);
  const [inputValue, setInputValue] = useState('');

  const optionsMarkup = useMemo(() => options.map((option) => {
    const {label, value} = option;

    return (
      <Listbox.Option
        key={`${value}`}
        value={value}
        selected={selectedGroups.includes(value)}
        accessibilityLabel={label}
      >
        {label}
      </Listbox.Option>
    );
  }), [options, selectedGroups]);

  const tagsMarkup = useMemo(() => selectedGroups.map((group) => (
    <Tag key={`option-${group}`}>
      {group}
    </Tag>
  )), [selectedGroups, onChangeSelectedGroups]);

  const escapeSpecialRegExCharacters = useCallback((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), []);

  const updateText = useCallback((value: string) => {
    setInputValue(value);

    if (value === '') {
      setOptions(COLOR_GROUPS);

      return;
    }

    const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), 'i');
    const resultOptions = COLOR_GROUPS.filter((option) => option.label.match(filterRegex));

    setOptions(resultOptions);
  }, [escapeSpecialRegExCharacters]);

  const updateSelection = useCallback((selected: string) => {
    if (selectedGroups.includes(selected)) {
      onChangeSelectedGroups(selectedGroups.filter((option) => option !== selected));
    } else {
      onChangeSelectedGroups([...selectedGroups, selected]);
    }

    updateText('');
  }, [selectedGroups, updateText]);

  return (
    <BlockStack gap="200">
      {!hideSelect && (
        <Combobox
          allowMultiple
          activator={
            <Combobox.TextField
              prefix={<Icon source={SearchIcon}/>}
              onChange={updateText}
              label="Groups"
              value={inputValue}
              placeholder="Search groups"
              autoComplete="off"
            />
          }
        >
          {optionsMarkup ? (
            <Listbox onSelect={updateSelection}>{optionsMarkup}</Listbox>
          ) : null}
        </Combobox>
      )}
      <InlineStack gap="200">
        {tagsMarkup}
      </InlineStack>
    </BlockStack>
  );
}

function VendorColorForm({ onAddVendorColor }: { onAddVendorColor: (color: string, groups: string[]) => void }) {
  const [color, setColor] = useState('');
  const [groups, setGroups] = useState<string[]>([]);

  const handleAddColorGroup = useCallback(() => {
    onAddVendorColor(color, groups);
    
    setColor('');
    setGroups([]);
  }, [color, groups]);

  const handleColorChange = useCallback((value: string) => setColor(value), []);

  const onChangeSelectedGroups = useCallback((values: string[]) => setGroups(values), []);

  return (
    <InlineGrid gap="400" columns={2}>
      <TextField
        value={color}
        onChange={handleColorChange}
        label="Color"
        type="text"
        autoComplete="off"
      />
      <MultiSelectGroups selectedGroups={groups} onChangeSelectedGroups={onChangeSelectedGroups} hideSelect={false} />
      <Box>
        <Button onClick={handleAddColorGroup} size="slim" disabled={!color || !groups.length}>Add Vendor Color</Button>
      </Box>
    </InlineGrid>
  );
}

function ColorGroupTable({currentVendor, onDeleteVendorColor, onUpdateVendorColor, submit}: {
  currentVendor: Vendor,
  onDeleteVendorColor: (color: string) => () => void,
  onUpdateVendorColor: (color: string, vendorColorUpdate: VendorColorUpdate) => Promise<void>,
  submit: SubmitFunction
}) {
  const actionData = useActionData<any>();
  const [colorFiles, setColorFiles] = useState<{[key: string]: File}>({});
  const [editing, setEditing] = useState<{[key: string]: {
    color: string,
    groups: string[]
  }}>({});

  /* UPDATING VENDOR COLOR */

  const handleColorChange = useCallback((color: string) => (value: string) => setEditing((prev) => ({
    ...prev,
    [color]: {
      ...prev[color],
      color: value
    }
  })), [setEditing]);

  const handleGroupsChange = useCallback((color: string) => (values: string[]) => setEditing((prev) => ({
    ...prev,
    [color]: {
      ...prev[color],
      groups: values
    }
  })), [setEditing]);

  const onEdit = useCallback((vendorColor: VendorColor) => () => setEditing((prev) => ({...prev, [vendorColor.color]: {
    color: vendorColor.color,
    groups: vendorColor.groups
  }})), [setEditing]);

  const onCancelEdit = useCallback((color: string) => () => {
    if (editing[color]) {
      delete editing[color];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing]);

  const onSaveEdit = useCallback((color: string) => () => {
    const editingVendorColor = editing[color];

    if (editingVendorColor) {
      onUpdateVendorColor(color, {
        color: editingVendorColor.color,
        groups: [...editingVendorColor.groups]
      });

      delete editing[color];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing]);

  /* UPDATING VENDOR COLOR: IMAGE FUNCTIONALITY */

  useEffect(() => {
    if (actionData?.stagedTarget) {
      handleUploadImage(actionData.color, actionData.stagedTarget);
    }
    else if (actionData?.imageSrc && colorFiles[actionData.color]) {
      onUpdateVendorColor(actionData.color, {
        imageSrc: actionData.imageSrc,
        shopImageIds: {[actionData.shop]: actionData.imageId}
      });

      delete colorFiles[actionData.color];
      setColorFiles((prev) => ({...prev}));
    }
  }, [actionData]);

  const handleUploadImage = useCallback(async (color: string, stagedTarget: any) => {
    if (!colorFiles[color]) {
      return;
    }

    const params = stagedTarget.parameters; // Parameters contain all the sensitive info we'll need to interact with the aws bucket.
    const url = stagedTarget.url; // This is the url you'll use to post data to aws. It's a generic s3 url that when combined with the params sends your data to the right place.
    const resourceUrl = stagedTarget.resourceUrl;

    const formData = new FormData();

    params.forEach(({ name, value }: {name: any, value: any}) => {
      formData.append(name, value);
    });

    formData.append("file", colorFiles[color]);

    await fetch(url, {
      method: "post",
      body: formData
    });

    submit({
      actionType: Action.UploadColorImage,
      resourceUrl,
      color
    }, { method: "POST" });
  }, [colorFiles]);

  const handleDropZoneDrop = useCallback((color: string) => async (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];

    setColorFiles((prev) => ({...prev, [color]: acceptedFile}));
    submit({
      actionType: Action.StageColorImage,
      color,
      file: JSON.stringify({ filename: acceptedFile.name, mimeType: acceptedFile.type, fileSize: acceptedFile.size.toString()})
    }, { method: "POST" });
  }, [setColorFiles]);

  const rows = useMemo(() => {
    const selectedVendorColors = currentVendor.colors;

    if (selectedVendorColors && Object.keys(selectedVendorColors).length) {
      return selectedVendorColors.map((vendorColor, index) => {
        return (
          <IndexTable.Row
            id={vendorColor.color}
            key={vendorColor.color}
            position={index}
          >
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <Box width="60px">
                <DropZone onDrop={handleDropZoneDrop(vendorColor.color)} allowMultiple={false} accept="image/png, image/jpeg">
                  {vendorColor.imageSrc ? (
                    <Thumbnail
                      size="medium"
                      alt={`${vendorColor.color} Color Image`}
                      source={vendorColor.imageSrc}
                    />
                  ) : (colorFiles[vendorColor.color] ? <Box paddingInline="500" paddingBlockStart="200"><Spinner accessibilityLabel="Loading Image" size="small" /></Box> : <DropZone.FileUpload />)}
                </DropZone>
              </Box>
            </td>

            <IndexTable.Cell>
              {editing[vendorColor.color] ? (
                <TextField
                  label="Color"
                  labelHidden
                  value={editing[vendorColor.color].color}
                  onChange={handleColorChange(vendorColor.color)}
                  autoComplete="off"
                />
              ) : (
                <Text variant="bodyMd" fontWeight="bold" as="span">
                  {vendorColor.color}
                </Text>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              <MultiSelectGroups
                selectedGroups={editing[vendorColor.color] ? editing[vendorColor.color].groups : vendorColor.groups}
                onChangeSelectedGroups={handleGroupsChange(vendorColor.color)}
                hideSelect={!editing[vendorColor.color]}
              />
            </IndexTable.Cell>

            <td style={{width: "100px"}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                {editing[vendorColor.color] ? (
                  <InlineGrid gap="100" columns={2} alignItems="center">
                    <Button icon={XIcon} accessibilityLabel="Cancel Color Group Edit" onClick={onCancelEdit(vendorColor.color)} /><Text as="span">Cancel</Text>
                    <Button icon={CheckIcon} accessibilityLabel="Save Color Group Edit" onClick={onSaveEdit(vendorColor.color)} /><Text as="span">Save</Text>
                  </InlineGrid>
                ) : (
                  <Button icon={EditIcon} accessibilityLabel="Edit Color Group" onClick={onEdit(vendorColor)} />
                )}
              </InlineStack>
            </td>
            
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteVendorColor(vendorColor.color)} />
              </InlineStack>
            </td>
          </IndexTable.Row>
      )});
    }
    else {
      return null;
    }
  }, [currentVendor.colors, colorFiles, editing]);

  return (
    <Card padding="0">
      <IndexTable
        itemCount={rows?.length ?? 0}
        selectable={false}
        headings={[
            {title: 'Image', alignment: 'center'},
            {title: 'Color'},
            {title: 'Group'},
            {title: 'Edit', alignment: 'center'},
            {title: 'Remove', alignment: 'end'}
          ]}
      >
        {rows}
      </IndexTable>
    </Card>
  );
};
