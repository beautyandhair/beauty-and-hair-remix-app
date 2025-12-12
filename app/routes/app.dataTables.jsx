import { Card,Layout,Page,Text,BlockStack,Button,Checkbox,Divider,ResourceList,ResourceItem,Avatar} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import React, { useEffect, useState, useCallback } from "react";



const ProductPicker = () => {
 const [checked, setChecked] = useState(false);
 const [checkedAllStores, setCheckedAllStores] = useState(true);
 const [statusText, setStatusText] = useState('Select products to refresh their data tables or refresh all products\' data tables.');
 const [refreshButtonText, setRefreshButtonText] = useState('Begin Data Tables Refresh');
 const [refreshButtonStatus, setRefreshButtonStatus] = useState(false);
 const [currentItem,setCurrentItem] = useState(1);
 const [resourceList, setResourceList] = useState([]);
 let selectedProducts = [];
 let [picker, setPicker] = useState(null);
 const handleChange = useCallback(
    (newChecked) => setChecked(newChecked),
    [],
  );
   const handleChangeAllStores = useCallback(
    (newChecked) => setCheckedAllStores(newChecked),
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
         let error_response_message = await response.text();

        setStatusText(error_response_message);
        throw new Error(`HTTP error! status: ${response.status} - ${error_response_message}`);
      }
      const data = await response.text();
      
      
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
                  
                  setRefreshButtonStatus(true);setRefreshButtonText('Refreshing all products data tables');
                   let response = await makeRequest('https://scripts.wigs.com/shopify/products/data-tables/gen-data-tables.php', 'POST', {
                        store: shopify.config.shop
                      }).then(x => {console.log('Response from data tables refresh:', x);});
                      


            }else{  
                if(picker){  
                  console.log('Refreshing selected products data tables:', picker);
                  selectedProducts = picker;
                  console.log('Selected products:', selectedProducts);
                  
                  if(selectedProducts.length > 0){
                      console.log('Refreshing selected products data tables:', selectedProducts);
                      setRefreshButtonStatus(true);setRefreshButtonText('Refreshing selected products data tables');setStatusText('Refreshing '+ currentItem +' of '+ selectedProducts.length +' selected products data tables, please wait...');
                       let payloadProducts = selectedProducts.map(product => {
                            
                          return {products: [product.id], store: shopify.config.shop, update_all_stores: checkedAllStores  }
                       }

                       );
                   
                       
                       for(let i = 0; i < payloadProducts.length; i++){
                        
                        setStatusText('Refreshing '+ (i + 1) +' of '+ selectedProducts.length +' selected products data tables, please wait...');
                        const singleItemList =  buildSelectedList([picker[i]]);    
                        setResourceList(singleItemList);
                        let response = await makeRequest('https://scripts.wigs.com/shopify/products/data-tables/gen-tables-dev.php', 'POST', payloadProducts[i]);
                        
                       }
                     
                      setResourceList([]);
      setRefreshButtonStatus(false);setStatusText('Data Tables Refresh Complete. Select more products or refresh all products\' data tables.');
      setRefreshButtonText('Begin Data Tables Refresh');
                    }
                }else{


                      console.log('No products selected');
                   
                      
                  
                }
            
             
            }
      } catch (error) {
            console.error('Error refreshing data tables:', error);
            console.error('Error refreshing data tables:', picker);
            console.error('Refresh unsuccessful:', selectedProducts);
            

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
                      <Divider borderColor="border" />
                      <Checkbox
                        label="Update data tables across all stores using wigs.com table tags. "
                        checked={checkedAllStores}
                        onChange={handleChangeAllStores} 

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


