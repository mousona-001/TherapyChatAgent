import { Project, SyntaxKind, ArrowFunction, Node, FunctionExpression, TypeReferenceNode, CallExpression, VariableDeclaration } from "ts-morph";

const project = new Project({
  skipAddingFilesFromTsConfig: true,
});

// Add all ts/tsx files in UI and Web
project.addSourceFilesAtPaths([
  "packages/ui/src/**/*.tsx",
  "packages/ui/src/**/*.ts",
  "apps/web/**/*.tsx",
  "apps/web/**/*.ts",
]);

const files = project.getSourceFiles();

let updatedFiles = 0;

for (const sourceFile of files) {
  let fileChanged = false;

  // 1. Fix imports
  const reactImports = sourceFile.getImportDeclarations().filter(
    (decl) => decl.getModuleSpecifierValue() === "react"
  );
  
  const namedImportsToAdd = new Set<string>();

  // Gather referenced React.X usages
  sourceFile.forEachDescendant((node) => {
    if (Node.isPropertyAccessExpression(node)) {
      if (node.getExpression().getText() === "React") {
        const name = node.getName();
        if (name !== "forwardRef") {
          namedImportsToAdd.add(name);
        }
      }
    }
  });
  
  // also check if forwardRef is imported directly
  let hasForwardRefImport = false;
  for (const importDecl of reactImports) {
      for (const named of importDecl.getNamedImports()) {
          if (named.getName() === "forwardRef") hasForwardRefImport = true;
      }
  }

  // 2. Remove forwardRef wrapped calls
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  
  // To avoid modifying things while iterating, collect and then replace carefully
  const forwardRefCalls: CallExpression[] = [];
  
  for (const callExpr of callExpressions) {
    const exprText = callExpr.getExpression().getText();
    if (exprText === "React.forwardRef" || exprText === "forwardRef") {
      forwardRefCalls.push(callExpr);
    }
  }
  
  // Update from bottom to top to preserve positions
  forwardRefCalls.reverse();

  for (const callExpr of forwardRefCalls) {
    const typeArgs = callExpr.getTypeArguments();
    // Default to 'any' if not provided
    const refType = typeArgs.length > 0 ? typeArgs[0].getText() : "any";
    const propsType = typeArgs.length > 1 ? typeArgs[1].getText() : "any";

    const args = callExpr.getArguments();
    if (args.length === 0) continue;
    
    // We expect the first argument to be an ArrowFunction or FunctionExpression
    const func = args[0];
    if (!Node.isArrowFunction(func) && !Node.isFunctionExpression(func)) continue;
    
    const params = func.getParameters();
    
    let newFuncText = "";
    
    // Check parameters. Usually: (props, ref) or ({ ...props }, ref)
    if (params.length === 2 || params.length === 1) {
      const propsParam = params[0];
      const hasRefParam = params.length === 2;
      
      let propsText = propsParam ? propsParam.getText() : "props";
      // ensure no type annotation on propsParam text itself since we will add it
      if (propsParam && propsParam.getTypeNode()) {
         propsText = propsText.replace(":" + propsParam.getTypeNode()?.getText(), "").trim();
      }

      // We need to inject `ref` into the props or keep it
      // Let's create the new props signature: a combination of the existing PropsType
      // plus the implicit ref typing, or simply ignore specific ref typing if the user handles it
      
      let finalPropsText = propsText;
      let injectRefToDestructure = false;
      
      if (propsText.startsWith("{")) {
        // It's destructured
        if (hasRefParam && !propsText.includes("ref") && !propsText.includes("...ref") && !propsText.includes("ref:")) {
           // We'll replace the first `{` with `{ ref, ` or insert it before `...props`
           
           // A safe way: parse it
           const objBinding = propsParam.getNameNode();
           if (Node.isObjectBindingPattern(objBinding)) {
              const elements = objBinding.getElements().map(e => e.getText());
              if (!elements.find(e => e === "ref" || e.startsWith("ref "))) {
                  // Add ref
                  const restElem = elements.find(e => e.startsWith("..."));
                  if (restElem) {
                      const withoutRest = elements.filter(e => !e.startsWith("..."));
                      finalPropsText = `{ ${[...withoutRest, "ref", restElem].join(", ")} }`;
                  } else {
                      finalPropsText = `{ ${[...elements, "ref"].join(", ")} }`;
                  }
              }
           }
        }
      } else {
        // It's an identifier like `props`
      }

      // the body
      const bodyText = func.getBody().getText();
      const isArrow = Node.isArrowFunction(func);
      const isAsync = func.isAsync();
      
      // Construct the new types
      let newType = propsType;
      // if propsType is any, try to extract from Node
      if (propsType === "any" && propsParam && propsParam.getTypeNode()) {
         newType = propsParam.getTypeNode()!.getText();
      }
      
      let newPropsWithRef = newType;
      if (newType !== "any") {
          newPropsWithRef = `React.PropsWithoutRef<${newType}> & { ref?: React.Ref<${refType}> }`;
          // add to namedImportsToAdd
      }

      if (isArrow) {
          if (newPropsWithRef !== "any") {
              newFuncText = `${isAsync ? "async " : ""}(${finalPropsText}: ${newType}) => ${bodyText}`;
              // Actually React 19 handles ref inside `ComponentProps`, so we don't necessarily NEED to augment the type 
              // if it's already a component prop. Let's just cast to the original type to avoid complex type errors, 
              // since ref is intrinsic now.
              newFuncText = `${isAsync ? "async " : ""}(${finalPropsText}: ${newType} & { ref?: React.Ref<${refType}> }) => ${bodyText}`;
          } else {
              newFuncText = `${isAsync ? "async " : ""}(${finalPropsText}: any) => ${bodyText}`;
          }
      } else {
          // FunctionExpression
          const name = func.getName() ? ` ${func.getName()}` : "";
          if (newPropsWithRef !== "any") {
             newFuncText = `${isAsync ? "async " : ""}function${name}(${finalPropsText}: ${newType} & { ref?: React.Ref<${refType}> }) ${bodyText}`;
          } else {
             newFuncText = `${isAsync ? "async " : ""}function${name}(${finalPropsText}: any) ${bodyText}`;
          }
      }
      
      // Replace the entire CallExpression with just the function
      callExpr.replaceWithText(newFuncText);
      fileChanged = true;
    }
  }

  // 3. Process the react imports
  // If we found `React.X`, replace `React.X` with `X` in the text.
  const propsAccesses = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
  const toReplace: { node: Node; newText: string; }[] = [];
  
  for (const propAccess of propsAccesses) {
      if (propAccess.getExpression().getText() === "React") {
          const name = propAccess.getName();
          // We don't remove React.HTMLAttributes etc because they are types
          // Wait, we can import types too: `import { HTMLAttributes } from "react"`
          // Only replace if we decided to (we will do it for all)
          namedImportsToAdd.add(name);
          toReplace.push({ node: propAccess, newText: name });
      }
  }
  
  // Sort reverse to replace from bottom to top
  toReplace.sort((a, b) => b.node.getPos() - a.node.getPos());
  for (const r of toReplace) {
      r.node.replaceWithText(r.newText);
      fileChanged = true;
  }

  // Fix the import at the top
  if (fileChanged || reactImports.length > 0) {
      // Find all existing named imports from "react"
      for (const importDecl of reactImports) {
          for (const named of importDecl.getNamedImports()) {
              if (named.getName() !== "forwardRef") {
                  namedImportsToAdd.add(named.getName());
              }
          }
      }
      
      if (namedImportsToAdd.size > 0 || reactImports.length > 0) {
          // Remove old imports
          for (const importDecl of reactImports) {
              importDecl.remove();
          }
          
          if (namedImportsToAdd.size > 0) {
              const sortedImports = Array.from(namedImportsToAdd).sort();
              sourceFile.insertImportDeclaration(0, {
                  moduleSpecifier: "react",
                  namedImports: sortedImports.map(name => ({ name })),
              });
              fileChanged = true;
          }
      }
  }

  if (fileChanged) {
    sourceFile.saveSync();
    updatedFiles++;
    console.log(`Updated ${sourceFile.getFilePath()}`);
  }
}

console.log(`Successfully updated ${updatedFiles} files.`);
