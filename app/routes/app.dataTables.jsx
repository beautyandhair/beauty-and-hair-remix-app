import { Card,Layout,Page,Text,BlockStack,Button,Checkbox,Divider,ResourceList,ResourceItem,Avatar} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import React, { useEffect, useState, useCallback } from "react";



const ProductPicker = () => {
 const [checked, setChecked] = useState(false);
 const [statusText, setStatusText] = useState('Select products to refresh their data tables or refresh all products\' data tables.');
 const [refreshButtonText, setRefreshButtonText] = useState('Begin Data Tables Refresh');
 const [refreshButtonStatus, setRefreshButtonStatus] = useState(false);
 const [resourceList, setResourceList] = useState([]);
 let selectedProducts = [];
 let [picker, setPicker] = useState(null);
 const handleChange = useCallback(
    (newChecked) => setChecked(newChecked),
    [],
  );


  const buildSelectedList = (picker) => {
    
    
    


    return(
      
      <ResourceList
        items={picker}
        resourceName={{singular: 'product', plural: 'products'}}
        renderItem={(item) => {
          const {id,title, images} = item;
          const media = <Avatar customer size="lg" name={title} />;
          const image = images[0].originalSrc;
        
          
            return (
          <ResourceItem
              id={id}
              
              media={
                <Avatar customer size="lg" name={title} source={image} />
              }
              accessibilityLabel={`${title}`}
              name={title}
            >
              <Text variant="bodyMd" fontWeight="bold" as="h3">
                {title}
              </Text>
              <div></div>
            </ResourceItem>
            )  }} >
      </ResourceList>

    );
    
  }






  const makeRequest = async (url, method = 'GET', body = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    const options = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.text();
      setResourceList([]);
      setRefreshButtonStatus(false);setStatusText('Data Tables Refresh Complete. Select more products or refresh all products\' data tables.');
      setRefreshButtonText('Begin Data Tables Refresh');
      
      return data;
    }
    catch (error) {
      console.error('Error making request:', error);
      throw error; // Re-throw the error for further handling if needed
    }
  };  

   const handleRefresh = async () => {

      try {

            if (checked) {
                  console.log('Refreshing all products data tables');
                  // Add your logic to refresh all products' data tables here
                  setRefreshButtonStatus(true);setRefreshButtonText('Refreshing all products data tables');
                   let response = await makeRequest('https://scripts.wigs.com/shopify/products/data-tables/generate-data-tables-bulk-ws.php', 'POST', {
                        store: shopify.config.shop
                      }).then(x => {console.log('Response from data tables refresh:', x);});
                      


            }else{  
                if(picker){  
                  console.log('Refreshing selected products data tables:', picker);
                  selectedProducts = picker;
                  console.log('Selected products:', selectedProducts);
                  if(selectedProducts.length > 0){
                      console.log('Refreshing selected products data tables:', selectedProducts);
                      setRefreshButtonStatus(true);setRefreshButtonText('Refreshing selected products data tables');setStatusText('Refreshing '+selectedProducts.length +' selected products data tables, please wait...');
                       let payloadProducts = selectedProducts.map(product => product.id);
                      let response = await makeRequest('https://scripts.wigs.com/shopify/products/data-tables/generate-data-tables-single-ws.php', 'POST', {
                        products: payloadProducts,
                        store: shopify.config.shop
                      });
                      console.log('Response from data tables refresh:', response);
                    }
                }else{


                      console.log('No products selected');
                      // Add your logic to handle no products selected here
                      // For example, show a message to the user
                      

                        //return redirect("/apps/polaris-test-app-11/app/additional");
                      
                  
                }
            
             
            }
      } catch (error) {
            console.error('Error refreshing data tables:', error);










            console.error('Error refreshing data tables:', picker);
            console.error('Refresh successful:', selectedProducts);
            

      }

   }

     const handleOpenPicker = async (type) => {
          try {
               
                await shopify.resourcePicker({
                    type: 'product',
                    multiple: type === 'y',
                    filter: {
                         variants: false,
                    },
               }).then(p => {if(p){setPicker(p);return buildSelectedList(p);}}  ).then(list => setResourceList(list)) ;

    
            console.log('picker done', picker);
          } catch (error) {
               console.error("Error opening product picker:", error);
          }
     };

     if(refreshButtonStatus){

      return (

<Page>
          <TitleBar title="Additional page" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400" inlineAlign="center">
               <Text as="p" variant="bodyMd">
                    {statusText}
                    </Text>
                    <Divider borderColor="border-inverse" />
                      {resourceList}
                  <Button onClick={() => { handleRefresh(); }} disabled={refreshButtonStatus}>{refreshButtonText}</Button>

            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
         </Page>


      );
     }

     return (
         <Page>
          <TitleBar title="Additional page" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400" inlineAlign="center">
               <Text as="p" variant="bodyMd">
                    {statusText}
                    </Text>
                    <Divider borderColor="border" />
                      <Checkbox
                        label="Refresh All Products' data tables (Currently Disabled)"
                        checked={checked}
                        onChange={handleChange}
                        disabled={true}
                      />        
                  <Divider borderColor="border-inverse" />
                  <Text as="p" variant="bodyMd">
                    Select specific products below.
                  </Text>

                  <Button onClick={() => handleOpenPicker("y")}>Select Products</Button>
                  
                    <Divider borderColor="border-inverse" />
                  {resourceList}
                  <Button onClick={() => handleRefresh()} disabled={refreshButtonStatus}>{refreshButtonText}</Button>
              
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
         </Page>
     );
};

export default ProductPicker;


