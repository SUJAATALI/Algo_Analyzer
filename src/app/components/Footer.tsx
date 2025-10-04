'use client';

import { Box, Container, Text, HStack, VStack, IconButton, Tooltip, Flex } from '@chakra-ui/react';
import { Github, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <Box
      as="footer"
      bg="transparent"
      color="gray.500"
    >
      <Container
        maxW="1200px"
        py={6}
        px={{ base: 6, md: 10 }}
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          justify="space-between" 
          align="center"
        >
          <Text fontSize="sm" mb={{ base: 4, md: 0 }}>
            © {new Date().getFullYear()} Algo Analyzer. All rights reserved.
          </Text>
          <VStack spacing={2} align={{ base: 'center', md: 'flex-end' }}>
            
            <HStack spacing={1}>
              <Text fontSize="xs" color="gray.600" mr={2}>Dev :</Text>
              <Tooltip label="Developer's GitHub" hasArrow bg="gray.700" color="white">
                <IconButton
                  as="a"
                  href="https://github.com/SUJAATALI"
                  target="_blank"
                  aria-label="Developer's GitHub"
                  icon={<Github size={20} />}
                  variant="ghost"
                  color="gray.500"
                  transition="color 0.2s"
                  _hover={{ color: 'white' }}
                  rounded="full"
                />
              </Tooltip>
              <Tooltip label="Developer's LinkedIn" hasArrow bg="gray.700" color="white">
                <IconButton
                  as="a"
                  href="https://www.linkedin.com/in/sujaatali/"
                  target="_blank"
                  aria-label="Developer's LinkedIn"
                  icon={<Linkedin size={20} />}
                  variant="ghost"
                  color="gray.500"
                  transition="color 0.2s"
                  _hover={{ color: 'white' }}
                  rounded="full"
                />
              </Tooltip>
              
            </HStack>
          </VStack>
        </Flex>
      </Container>
    </Box>
  );
}

export default Footer;
