/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Helper functions for generating PHP for blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP');

goog.require('Blockly.Generator');
goog.require('Blockly.utils.string');


/**
 * PHP code generator.
 * @type {!Blockly.Generator}
 */
Blockly.PHP = new Blockly.Generator('PHP');

/**
 * List of illegal variable names.
 * This is not intended to be a security feature.  Blockly is 100% client-side,
 * so bypassing this list is trivial.  This is intended to prevent users from
 * accidentally clobbering a built-in object or function.
 * @private
 */
Blockly.PHP.addReservedWords(
        // http://php.net/manual/en/reserved.keywords.php
    '__halt_compiler,abstract,and,array,as,break,callable,case,catch,class,' +
    'clone,const,continue,declare,default,die,do,echo,else,elseif,empty,' +
    'enddeclare,endfor,endforeach,endif,endswitch,endwhile,eval,exit,extends,' +
    'final,for,foreach,function,global,goto,if,implements,include,' +
    'include_once,instanceof,insteadof,interface,isset,list,namespace,new,or,' +
    'print,private,protected,public,require,require_once,return,static,' +
    'switch,throw,trait,try,unset,use,var,while,xor,' +
        // http://php.net/manual/en/reserved.constants.php
    'PHP_VERSION,PHP_MAJOR_VERSION,PHP_MINOR_VERSION,PHP_RELEASE_VERSION,' +
    'PHP_VERSION_ID,PHP_EXTRA_VERSION,PHP_ZTS,PHP_DEBUG,PHP_MAXPATHLEN,' +
    'PHP_OS,PHP_SAPI,PHP_EOL,PHP_INT_MAX,PHP_INT_SIZE,DEFAULT_INCLUDE_PATH,' +
    'PEAR_INSTALL_DIR,PEAR_EXTENSION_DIR,PHP_EXTENSION_DIR,PHP_PREFIX,' +
    'PHP_BINDIR,PHP_BINARY,PHP_MANDIR,PHP_LIBDIR,PHP_DATADIR,PHP_SYSCONFDIR,' +
    'PHP_LOCALSTATEDIR,PHP_CONFIG_FILE_PATH,PHP_CONFIG_FILE_SCAN_DIR,' +
    'PHP_SHLIB_SUFFIX,E_ERROR,E_WARNING,E_PARSE,E_NOTICE,E_CORE_ERROR,' +
    'E_CORE_WARNING,E_COMPILE_ERROR,E_COMPILE_WARNING,E_USER_ERROR,' +
    'E_USER_WARNING,E_USER_NOTICE,E_DEPRECATED,E_USER_DEPRECATED,E_ALL,' +
    'E_STRICT,__COMPILER_HALT_OFFSET__,TRUE,FALSE,NULL,__CLASS__,__DIR__,' +
    '__FILE__,__FUNCTION__,__LINE__,__METHOD__,__NAMESPACE__,__TRAIT__'
);

/**
 * Order of operation ENUMs.
 * http://php.net/manual/en/language.operators.precedence.php
 */
Blockly.PHP.ORDER_ATOMIC = 0;             // 0 "" ...
Blockly.PHP.ORDER_CLONE = 1;              // clone
Blockly.PHP.ORDER_NEW = 1;                // new
Blockly.PHP.ORDER_MEMBER = 2.1;           // []
Blockly.PHP.ORDER_FUNCTION_CALL = 2.2;    // ()
Blockly.PHP.ORDER_POWER = 3;              // **
Blockly.PHP.ORDER_INCREMENT = 4;          // ++
Blockly.PHP.ORDER_DECREMENT = 4;          // --
Blockly.PHP.ORDER_BITWISE_NOT = 4;        // ~
Blockly.PHP.ORDER_CAST = 4;               // (int) (float) (string) (array) ...
Blockly.PHP.ORDER_SUPPRESS_ERROR = 4;     // @
Blockly.PHP.ORDER_INSTANCEOF = 5;         // instanceof
Blockly.PHP.ORDER_LOGICAL_NOT = 6;        // !
Blockly.PHP.ORDER_UNARY_PLUS = 7.1;       // +
Blockly.PHP.ORDER_UNARY_NEGATION = 7.2;   // -
Blockly.PHP.ORDER_MULTIPLICATION = 8.1;   // *
Blockly.PHP.ORDER_DIVISION = 8.2;         // /
Blockly.PHP.ORDER_MODULUS = 8.3;          // %
Blockly.PHP.ORDER_ADDITION = 9.1;         // +
Blockly.PHP.ORDER_SUBTRACTION = 9.2;      // -
Blockly.PHP.ORDER_STRING_CONCAT = 9.3;    // .
Blockly.PHP.ORDER_BITWISE_SHIFT = 10;     // << >>
Blockly.PHP.ORDER_RELATIONAL = 11;        // < <= > >=
Blockly.PHP.ORDER_EQUALITY = 12;          // == != === !== <> <=>
Blockly.PHP.ORDER_REFERENCE = 13;         // &
Blockly.PHP.ORDER_BITWISE_AND = 13;       // &
Blockly.PHP.ORDER_BITWISE_XOR = 14;       // ^
Blockly.PHP.ORDER_BITWISE_OR = 15;        // |
Blockly.PHP.ORDER_LOGICAL_AND = 16;       // &&
Blockly.PHP.ORDER_LOGICAL_OR = 17;        // ||
Blockly.PHP.ORDER_IF_NULL = 18;           // ??
Blockly.PHP.ORDER_CONDITIONAL = 19;       // ?:
Blockly.PHP.ORDER_ASSIGNMENT = 20;        // = += -= *= /= %= <<= >>= ...
Blockly.PHP.ORDER_LOGICAL_AND_WEAK = 21;  // and
Blockly.PHP.ORDER_LOGICAL_XOR = 22;       // xor
Blockly.PHP.ORDER_LOGICAL_OR_WEAK = 23;   // or
Blockly.PHP.ORDER_COMMA = 24;             // ,
Blockly.PHP.ORDER_NONE = 99;              // (...)

/**
 * List of outer-inner pairings that do NOT require parentheses.
 * @type {!Array.<!Array.<number>>}
 */
Blockly.PHP.ORDER_OVERRIDES = [
  // (foo()).bar() -> foo().bar()
  // (foo())[0] -> foo()[0]
  [Blockly.PHP.ORDER_MEMBER, Blockly.PHP.ORDER_FUNCTION_CALL],
  // (foo[0])[1] -> foo[0][1]
  // (foo.bar).baz -> foo.bar.baz
  [Blockly.PHP.ORDER_MEMBER, Blockly.PHP.ORDER_MEMBER],
  // !(!foo) -> !!foo
  [Blockly.PHP.ORDER_LOGICAL_NOT, Blockly.PHP.ORDER_LOGICAL_NOT],
  // a * (b * c) -> a * b * c
  [Blockly.PHP.ORDER_MULTIPLICATION, Blockly.PHP.ORDER_MULTIPLICATION],
  // a + (b + c) -> a + b + c
  [Blockly.PHP.ORDER_ADDITION, Blockly.PHP.ORDER_ADDITION],
  // a && (b && c) -> a && b && c
  [Blockly.PHP.ORDER_LOGICAL_AND, Blockly.PHP.ORDER_LOGICAL_AND],
  // a || (b || c) -> a || b || c
  [Blockly.PHP.ORDER_LOGICAL_OR, Blockly.PHP.ORDER_LOGICAL_OR]
];

/**
 * Initialise the database of variable names.
 * @param {!Blockly.Workspace} workspace Workspace to generate code from.
 */
Blockly.PHP.init = function(workspace) {
  // Create a dictionary of definitions to be printed before the code.
  Blockly.PHP.definitions_ = Object.create(null);
  // Create a dictionary mapping desired function names in definitions_
  // to actual function names (to avoid collisions with user functions).
  Blockly.PHP.functionNames_ = Object.create(null);

  if (!Blockly.PHP.variableDB_) {
    Blockly.PHP.variableDB_ =
        new Blockly.Names(Blockly.PHP.RESERVED_WORDS_, '$');
  } else {
    Blockly.PHP.variableDB_.reset();
  }

  Blockly.PHP.variableDB_.setVariableMap(workspace.getVariableMap());

  var defvars = [];
  // Add developer variables (not created or named by the user).
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    defvars.push(Blockly.PHP.variableDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE) + ';');
  }

  // Add user variables, but only ones that are being used.
  var variables = Blockly.Variables.allUsedVarModels(workspace);
  for (var i = 0, variable; variable = variables[i]; i++) {
    defvars.push(Blockly.PHP.variableDB_.getName(variable.getId(),
        Blockly.VARIABLE_CATEGORY_NAME) + ';');
  }

  // Declare all of the variables.
  Blockly.PHP.definitions_['variables'] = defvars.join('\n');
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blockly.PHP.finish = function(code) {
  // Convert the definitions dictionary into a list.
  var definitions = [];
  for (var name in Blockly.PHP.definitions_) {
    definitions.push(Blockly.PHP.definitions_[name]);
  }
  // Clean up temporary data.
  delete Blockly.PHP.definitions_;
  delete Blockly.PHP.functionNames_;
  Blockly.PHP.variableDB_.reset();
  return definitions.join('\n\n') + '\n\n\n' + code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blockly.PHP.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped PHP string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} PHP string.
 * @private
 */
Blockly.PHP.quote_ = function(string) {
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};

/**
 * Encode a string as a properly escaped multiline PHP string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} PHP string.
 * @private
 */
Blockly.PHP.multiline_quote_ = function(string) {
  return '<<<EOT\n' + string + '\nEOT';
};

/**
 * Common tasks for generating PHP from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The PHP code created for this block.
 * @param {boolean=} opt_thisOnly True to generate code for only this statement.
 * @return {string} PHP code with comments and subsequent blocks added.
 * @private
 */
Blockly.PHP.scrub_ = function(block, code, opt_thisOnly) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      comment = Blockly.utils.string.wrap(comment,
          Blockly.PHP.COMMENT_WRAP - 3);
      commentCode += Blockly.PHP.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var i = 0; i < block.inputList.length; i++) {
      if (block.inputList[i].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[i].connection.targetBlock();
        if (childBlock) {
          comment = Blockly.PHP.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blockly.PHP.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = opt_thisOnly ? '' : Blockly.PHP.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

/**
 * Gets a property and adjusts the value while taking into account indexing.
 * @param {!Blockly.Block} block The block.
 * @param {string} atId The property ID of the element to get.
 * @param {number=} opt_delta Value to add.
 * @param {boolean=} opt_negate Whether to negate the value.
 * @param {number=} opt_order The highest order acting on this value.
 * @return {string|number}
 */
Blockly.PHP.getAdjusted = function(block, atId, opt_delta, opt_negate,
    opt_order) {
  var delta = opt_delta || 0;
  var order = opt_order || Blockly.PHP.ORDER_NONE;
  if (block.workspace.options.oneBasedIndex) {
    delta--;
  }
  var defaultAtIndex = block.workspace.options.oneBasedIndex ? '1' : '0';
  if (delta > 0) {
    var at = Blockly.PHP.valueToCode(block, atId,
            Blockly.PHP.ORDER_ADDITION) || defaultAtIndex;
  } else if (delta < 0) {
    var at = Blockly.PHP.valueToCode(block, atId,
            Blockly.PHP.ORDER_SUBTRACTION) || defaultAtIndex;
  } else if (opt_negate) {
    var at = Blockly.PHP.valueToCode(block, atId,
            Blockly.PHP.ORDER_UNARY_NEGATION) || defaultAtIndex;
  } else {
    var at = Blockly.PHP.valueToCode(block, atId, order) ||
        defaultAtIndex;
  }

  if (Blockly.isNumber(at)) {
    // If the index is a naked number, adjust it right now.
    at = Number(at) + delta;
    if (opt_negate) {
      at = -at;
    }
  } else {
    // If the index is dynamic, adjust it in code.
    if (delta > 0) {
      at = at + ' + ' + delta;
      var innerOrder = Blockly.PHP.ORDER_ADDITION;
    } else if (delta < 0) {
      at = at + ' - ' + -delta;
      var innerOrder = Blockly.PHP.ORDER_SUBTRACTION;
    }
    if (opt_negate) {
      if (delta) {
        at = '-(' + at + ')';
      } else {
        at = '-' + at;
      }
      var innerOrder = Blockly.PHP.ORDER_UNARY_NEGATION;
    }
    innerOrder = Math.floor(innerOrder);
    order = Math.floor(order);
    if (innerOrder && order >= innerOrder) {
      at = '(' + at + ')';
    }
  }
  return at;
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for colour blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.colour');

goog.require('Blockly.PHP');


Blockly.PHP['colour_picker'] = function(block) {
  // Colour picker.
  var code = Blockly.PHP.quote_(block.getFieldValue('COLOUR'));
  return [code, Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['colour_random'] = function(block) {
  // Generate a random colour.
  var functionName = Blockly.PHP.provideFunction_(
      'colour_random',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ + '() {',
       '  return \'#\' . str_pad(dechex(mt_rand(0, 0xFFFFFF)), ' +
          '6, \'0\', STR_PAD_LEFT);',
       '}']);
  var code = functionName + '()';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['colour_rgb'] = function(block) {
  // Compose a colour from RGB components expressed as percentages.
  var red = Blockly.PHP.valueToCode(block, 'RED',
      Blockly.PHP.ORDER_COMMA) || 0;
  var green = Blockly.PHP.valueToCode(block, 'GREEN',
      Blockly.PHP.ORDER_COMMA) || 0;
  var blue = Blockly.PHP.valueToCode(block, 'BLUE',
      Blockly.PHP.ORDER_COMMA) || 0;
  var functionName = Blockly.PHP.provideFunction_(
      'colour_rgb',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($r, $g, $b) {',
       '  $r = round(max(min($r, 100), 0) * 2.55);',
       '  $g = round(max(min($g, 100), 0) * 2.55);',
       '  $b = round(max(min($b, 100), 0) * 2.55);',
       '  $hex = \'#\';',
       '  $hex .= str_pad(dechex($r), 2, \'0\', STR_PAD_LEFT);',
       '  $hex .= str_pad(dechex($g), 2, \'0\', STR_PAD_LEFT);',
       '  $hex .= str_pad(dechex($b), 2, \'0\', STR_PAD_LEFT);',
       '  return $hex;',
       '}']);
  var code = functionName + '(' + red + ', ' + green + ', ' + blue + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['colour_blend'] = function(block) {
  // Blend two colours together.
  var c1 = Blockly.PHP.valueToCode(block, 'COLOUR1',
      Blockly.PHP.ORDER_COMMA) || '\'#000000\'';
  var c2 = Blockly.PHP.valueToCode(block, 'COLOUR2',
      Blockly.PHP.ORDER_COMMA) || '\'#000000\'';
  var ratio = Blockly.PHP.valueToCode(block, 'RATIO',
      Blockly.PHP.ORDER_COMMA) || 0.5;
  var functionName = Blockly.PHP.provideFunction_(
      'colour_blend',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($c1, $c2, $ratio) {',
       '  $ratio = max(min($ratio, 1), 0);',
       '  $r1 = hexdec(substr($c1, 1, 2));',
       '  $g1 = hexdec(substr($c1, 3, 2));',
       '  $b1 = hexdec(substr($c1, 5, 2));',
       '  $r2 = hexdec(substr($c2, 1, 2));',
       '  $g2 = hexdec(substr($c2, 3, 2));',
       '  $b2 = hexdec(substr($c2, 5, 2));',
       '  $r = round($r1 * (1 - $ratio) + $r2 * $ratio);',
       '  $g = round($g1 * (1 - $ratio) + $g2 * $ratio);',
       '  $b = round($b1 * (1 - $ratio) + $b2 * $ratio);',
       '  $hex = \'#\';',
       '  $hex .= str_pad(dechex($r), 2, \'0\', STR_PAD_LEFT);',
       '  $hex .= str_pad(dechex($g), 2, \'0\', STR_PAD_LEFT);',
       '  $hex .= str_pad(dechex($b), 2, \'0\', STR_PAD_LEFT);',
       '  return $hex;',
       '}']);
  var code = functionName + '(' + c1 + ', ' + c2 + ', ' + ratio + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for list blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */

/**
 * Lists in PHP are known to break when non-variables are passed into blocks
 * that require a list. PHP, unlike other languages, passes arrays as reference
 * value instead of value so we are unable to support it to the extent we can
 * for the other languages.
 * For example, a ternary operator with two arrays will return the array by
 * value and that cannot be passed into any of the built-in array functions for
 * PHP (because only variables can be passed by reference).
 * ex:  end(true ? list1 : list2)
 */
'use strict';

goog.provide('Blockly.PHP.lists');

goog.require('Blockly.PHP');


Blockly.PHP['lists_create_empty'] = function(block) {
  // Create an empty list.
  return ['array()', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_create_with'] = function(block) {
  // Create a list with any number of elements of any type.
  var code = new Array(block.itemCount_);
  for (var i = 0; i < block.itemCount_; i++) {
    code[i] = Blockly.PHP.valueToCode(block, 'ADD' + i,
        Blockly.PHP.ORDER_COMMA) || 'null';
  }
  code = 'array(' + code.join(', ') + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_repeat'] = function(block) {
  // Create a list with one element repeated.
  var functionName = Blockly.PHP.provideFunction_(
      'lists_repeat',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($value, $count) {',
       '  $array = array();',
       '  for ($index = 0; $index < $count; $index++) {',
       '    $array[] = $value;',
       '  }',
       '  return $array;',
       '}']);
  var element = Blockly.PHP.valueToCode(block, 'ITEM',
      Blockly.PHP.ORDER_COMMA) || 'null';
  var repeatCount = Blockly.PHP.valueToCode(block, 'NUM',
      Blockly.PHP.ORDER_COMMA) || '0';
  var code = functionName + '(' + element + ', ' + repeatCount + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_length'] = function(block) {
  // String or array length.
  var functionName = Blockly.PHP.provideFunction_(
      'length',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ + '($value) {',
       '  if (is_string($value)) {',
       '    return strlen($value);',
       '  } else {',
       '    return count($value);',
       '  }',
       '}']);
  var list = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  return [functionName + '(' + list + ')', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var argument0 = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_FUNCTION_CALL) || 'array()';
  return ['empty(' + argument0 + ')', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_indexOf'] = function(block) {
  // Find an item in the list.
  var argument0 = Blockly.PHP.valueToCode(block, 'FIND',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  var argument1 = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_MEMBER) || '[]';
  if (block.workspace.options.oneBasedIndex) {
    var errorIndex = ' 0';
    var indexAdjustment = ' + 1';
  } else {
    var errorIndex = ' -1';
    var indexAdjustment = '';
  }
  if (block.getFieldValue('END') == 'FIRST') {
    // indexOf
    var functionName = Blockly.PHP.provideFunction_(
        'indexOf',
        ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
            '($haystack, $needle) {',
         '  for ($index = 0; $index < count($haystack); $index++) {',
         '    if ($haystack[$index] == $needle) return $index' +
            indexAdjustment + ';',
         '  }',
         '  return ' + errorIndex + ';',
         '}']);
  } else {
    // lastIndexOf
    var functionName = Blockly.PHP.provideFunction_(
        'lastIndexOf',
        ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
            '($haystack, $needle) {',
         '  $last = ' + errorIndex + ';',
         '  for ($index = 0; $index < count($haystack); $index++) {',
         '    if ($haystack[$index] == $needle) $last = $index' +
            indexAdjustment + ';',
         '  }',
         '  return $last;',
         '}']);
  }

  var code = functionName + '(' + argument1 + ', ' + argument0 + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_getIndex'] = function(block) {
  // Get element at index.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  switch (where) {
    case 'FIRST':
      if (mode == 'GET') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_MEMBER) || 'array()';
        var code = list + '[0]';
        return [code, Blockly.PHP.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        var code = 'array_shift(' + list + ')';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        return 'array_shift(' + list + ');\n';
      }
      break;
    case 'LAST':
      if (mode == 'GET') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        var code = 'end(' + list + ')';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        var code = 'array_pop(' + list + ')';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        return 'array_pop(' + list + ');\n';
      }
      break;
    case 'FROM_START':
      var at = Blockly.PHP.getAdjusted(block, 'AT');
      if (mode == 'GET') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_MEMBER) || 'array()';
        var code = list + '[' + at + ']';
        return [code, Blockly.PHP.ORDER_MEMBER];
      } else if (mode == 'GET_REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_COMMA) || 'array()';
        var code = 'array_splice(' + list + ', ' + at + ', 1)[0]';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_COMMA) || 'array()';
        return 'array_splice(' + list + ', ' + at + ', 1);\n';
      }
      break;
    case 'FROM_END':
      if (mode == 'GET') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_COMMA) || 'array()';
        var at = Blockly.PHP.getAdjusted(block, 'AT', 1, true);
        var code = 'array_slice(' + list + ', ' + at + ', 1)[0]';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE' || mode == 'REMOVE') {
        var list = Blockly.PHP.valueToCode(block, 'VALUE',
                Blockly.PHP.ORDER_NONE) || 'array()';
        var at = Blockly.PHP.getAdjusted(block, 'AT', 1, false,
            Blockly.PHP.ORDER_SUBTRACTION);
        code = 'array_splice(' + list +
            ', count(' + list + ') - ' + at + ', 1)[0]';
        if (mode == 'GET_REMOVE') {
          return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
        } else if (mode == 'REMOVE') {
          return code + ';\n';
        }
      }
      break;
    case 'RANDOM':
      var list = Blockly.PHP.valueToCode(block, 'VALUE',
              Blockly.PHP.ORDER_NONE) || 'array()';
      if (mode == 'GET') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_get_random_item',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '($list) {',
             '  return $list[rand(0,count($list)-1)];',
             '}']);
        code = functionName + '(' + list + ')';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'GET_REMOVE') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_get_remove_random_item',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '(&$list) {',
             '  $x = rand(0,count($list)-1);',
             '  unset($list[$x]);',
             '  return array_values($list);',
             '}']);
        code = functionName + '(' + list + ')';
        return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
      } else if (mode == 'REMOVE') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_remove_random_item',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '(&$list) {',
             '  unset($list[rand(0,count($list)-1)]);',
             '}']);
        return functionName + '(' + list + ');\n';
      }
      break;
  }
  throw Error('Unhandled combination (lists_getIndex).');
};

Blockly.PHP['lists_setIndex'] = function(block) {
  // Set element at index.
  // Note: Until February 2013 this block did not have MODE or WHERE inputs.
  var mode = block.getFieldValue('MODE') || 'GET';
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var value = Blockly.PHP.valueToCode(block, 'TO',
      Blockly.PHP.ORDER_ASSIGNMENT) || 'null';
  // Cache non-trivial values to variables to prevent repeated look-ups.
  // Closure, which accesses and modifies 'list'.
  function cacheList() {
    if (list.match(/^\$\w+$/)) {
      return '';
    }
    var listVar = Blockly.PHP.variableDB_.getDistinctName(
        'tmp_list', Blockly.VARIABLE_CATEGORY_NAME);
    var code = listVar + ' = &' + list + ';\n';
    list = listVar;
    return code;
  }
  switch (where) {
    case 'FIRST':
      if (mode == 'SET') {
        var list = Blockly.PHP.valueToCode(block, 'LIST',
                Blockly.PHP.ORDER_MEMBER) || 'array()';
        return list + '[0] = ' + value + ';\n';
      } else if (mode == 'INSERT') {
        var list = Blockly.PHP.valueToCode(block, 'LIST',
                Blockly.PHP.ORDER_COMMA) || 'array()';
        return 'array_unshift(' + list + ', ' + value + ');\n';
      }
      break;
    case 'LAST':
      var list = Blockly.PHP.valueToCode(block, 'LIST',
              Blockly.PHP.ORDER_COMMA) || 'array()';
      if (mode == 'SET') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_set_last_item',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '(&$list, $value) {',
             '  $list[count($list) - 1] = $value;',
             '}']);
        return functionName + '(' + list + ', ' + value + ');\n';
      } else if (mode == 'INSERT') {
        return 'array_push(' + list + ', ' + value + ');\n';
      }
      break;
    case 'FROM_START':
      var at = Blockly.PHP.getAdjusted(block, 'AT');
      if (mode == 'SET') {
        var list = Blockly.PHP.valueToCode(block, 'LIST',
                Blockly.PHP.ORDER_MEMBER) || 'array()';
        return list + '[' + at + '] = ' + value + ';\n';
      } else if (mode == 'INSERT') {
        var list = Blockly.PHP.valueToCode(block, 'LIST',
                Blockly.PHP.ORDER_COMMA) || 'array()';
        return 'array_splice(' + list + ', ' + at + ', 0, ' + value + ');\n';
      }
      break;
    case 'FROM_END':
      var list = Blockly.PHP.valueToCode(block, 'LIST',
              Blockly.PHP.ORDER_COMMA) || 'array()';
      var at = Blockly.PHP.getAdjusted(block, 'AT', 1);
      if (mode == 'SET') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_set_from_end',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '(&$list, $at, $value) {',
             '  $list[count($list) - $at] = $value;',
             '}']);
        return functionName + '(' + list + ', ' + at + ', ' + value + ');\n';
      } else if (mode == 'INSERT') {
        var functionName = Blockly.PHP.provideFunction_(
            'lists_insert_from_end',
            ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
                '(&$list, $at, $value) {',
             '  return array_splice($list, count($list) - $at, 0, $value);',
             '}']);
        return functionName + '(' + list + ', ' + at + ', ' + value + ');\n';
      }
      break;
    case 'RANDOM':
      var list = Blockly.PHP.valueToCode(block, 'LIST',
              Blockly.PHP.ORDER_REFERENCE) || 'array()';
      var code = cacheList();
      var xVar = Blockly.PHP.variableDB_.getDistinctName(
          'tmp_x', Blockly.VARIABLE_CATEGORY_NAME);
      code += xVar + ' = rand(0, count(' + list + ')-1);\n';
      if (mode == 'SET') {
        code += list + '[' + xVar + '] = ' + value + ';\n';
        return code;
      } else if (mode == 'INSERT') {
        code += 'array_splice(' + list + ', ' + xVar + ', 0, ' + value +
            ');\n';
        return code;
      }
      break;
  }
  throw Error('Unhandled combination (lists_setIndex).');
};

Blockly.PHP['lists_getSublist'] = function(block) {
  // Get sublist.
  var list = Blockly.PHP.valueToCode(block, 'LIST',
      Blockly.PHP.ORDER_COMMA) || 'array()';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = list;
  } else if (list.match(/^\$\w+$/) ||
      (where1 != 'FROM_END' && where2 == 'FROM_START')) {
    // If the list is a simple value or doesn't require a call for length, don't
    // generate a helper function.
    switch (where1) {
      case 'FROM_START':
        var at1 = Blockly.PHP.getAdjusted(block, 'AT1');
        break;
      case 'FROM_END':
        var at1 = Blockly.PHP.getAdjusted(block, 'AT1', 1, false,
            Blockly.PHP.ORDER_SUBTRACTION);
        at1 = 'count(' + list + ') - ' + at1;
        break;
      case 'FIRST':
        var at1 = '0';
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    switch (where2) {
      case 'FROM_START':
        var at2 = Blockly.PHP.getAdjusted(block, 'AT2', 0, false,
            Blockly.PHP.ORDER_SUBTRACTION);
        var length = at2 + ' - ';
        if (Blockly.isNumber(String(at1)) || String(at1).match(/^\(.+\)$/)) {
          length += at1;
        } else {
          length += '(' + at1 + ')';
        }
        length += ' + 1';
        break;
      case 'FROM_END':
        var at2 = Blockly.PHP.getAdjusted(block, 'AT2', 0, false,
            Blockly.PHP.ORDER_SUBTRACTION);
        var length = 'count(' + list + ') - ' + at2 + ' - ';
        if (Blockly.isNumber(String(at1)) || String(at1).match(/^\(.+\)$/)) {
          length += at1;
        } else {
          length += '(' + at1 + ')';
        }
        break;
      case 'LAST':
        var length = 'count(' + list + ') - ';
        if (Blockly.isNumber(String(at1)) || String(at1).match(/^\(.+\)$/)) {
          length += at1;
        } else {
          length += '(' + at1 + ')';
        }
        break;
      default:
        throw Error('Unhandled option (lists_getSublist).');
    }
    code = 'array_slice(' + list + ', ' + at1 + ', ' + length + ')';
  } else {
    var at1 = Blockly.PHP.getAdjusted(block, 'AT1');
    var at2 = Blockly.PHP.getAdjusted(block, 'AT2');
    var functionName = Blockly.PHP.provideFunction_(
        'lists_get_sublist',
        ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
            '($list, $where1, $at1, $where2, $at2) {',
         '  if ($where1 == \'FROM_END\') {',
         '    $at1 = count($list) - 1 - $at1;',
         '  } else if ($where1 == \'FIRST\') {',
         '    $at1 = 0;',
         '  } else if ($where1 != \'FROM_START\') {',
         '    throw new Exception(\'Unhandled option (lists_get_sublist).\');',
         '  }',
         '  $length = 0;',
         '  if ($where2 == \'FROM_START\') {',
         '    $length = $at2 - $at1 + 1;',
         '  } else if ($where2 == \'FROM_END\') {',
         '    $length = count($list) - $at1 - $at2;',
         '  } else if ($where2 == \'LAST\') {',
         '    $length = count($list) - $at1;',
         '  } else {',
         '    throw new Exception(\'Unhandled option (lists_get_sublist).\');',
         '  }',
         '  return array_slice($list, $at1, $length);',
         '}']);
    var code = functionName + '(' + list + ', \'' +
        where1 + '\', ' + at1 + ', \'' + where2 + '\', ' + at2 + ')';
  }
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_sort'] = function(block) {
  // Block for sorting a list.
  var listCode = Blockly.PHP.valueToCode(block, 'LIST',
      Blockly.PHP.ORDER_COMMA) || 'array()';
  var direction = block.getFieldValue('DIRECTION') === '1' ? 1 : -1;
  var type = block.getFieldValue('TYPE');
  var functionName = Blockly.PHP.provideFunction_(
      'lists_sort',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($list, $type, $direction) {',
       '  $sortCmpFuncs = array(',
       '    "NUMERIC" => "strnatcasecmp",',
       '    "TEXT" => "strcmp",',
       '    "IGNORE_CASE" => "strcasecmp"',
       '  );',
       '  $sortCmp = $sortCmpFuncs[$type];',
       '  $list2 = $list;', // Clone list.
       '  usort($list2, $sortCmp);',
       '  if ($direction == -1) {',
       '    $list2 = array_reverse($list2);',
       '  }',
       '  return $list2;',
       '}']);
  var sortCode = functionName +
      '(' + listCode + ', "' + type + '", ' + direction + ')';
  return [sortCode, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_split'] = function(block) {
  // Block for splitting text into a list, or joining a list into text.
  var value_input = Blockly.PHP.valueToCode(block, 'INPUT',
      Blockly.PHP.ORDER_COMMA);
  var value_delim = Blockly.PHP.valueToCode(block, 'DELIM',
      Blockly.PHP.ORDER_COMMA) || '\'\'';
  var mode = block.getFieldValue('MODE');
  if (mode == 'SPLIT') {
    if (!value_input) {
      value_input = '\'\'';
    }
    var functionName = 'explode';
  } else if (mode == 'JOIN') {
    if (!value_input) {
      value_input = 'array()';
    }
    var functionName = 'implode';
  } else {
    throw Error('Unknown mode: ' + mode);
  }
  var code = functionName + '(' + value_delim + ', ' + value_input + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['lists_reverse'] = function(block) {
  // Block for reversing a list.
  var list = Blockly.PHP.valueToCode(block, 'LIST',
      Blockly.PHP.ORDER_COMMA) || '[]';
  var code = 'array_reverse(' + list + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for logic blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.logic');

goog.require('Blockly.PHP');


Blockly.PHP['controls_if'] = function(block) {
  // If/elseif/else condition.
  var n = 0;
  var code = '', branchCode, conditionCode;
  if (Blockly.PHP.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    code += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_PREFIX, block);
  }
  do {
    conditionCode = Blockly.PHP.valueToCode(block, 'IF' + n,
        Blockly.PHP.ORDER_NONE) || 'false';
    branchCode = Blockly.PHP.statementToCode(block, 'DO' + n);
    if (Blockly.PHP.STATEMENT_SUFFIX) {
      branchCode = Blockly.PHP.prefixLines(
          Blockly.PHP.injectId(Blockly.PHP.STATEMENT_SUFFIX, block),
          Blockly.PHP.INDENT) + branchCode;
    }
    code += (n > 0 ? ' else ' : '') +
        'if (' + conditionCode + ') {\n' + branchCode + '}';
    ++n;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || Blockly.PHP.STATEMENT_SUFFIX) {
    branchCode = Blockly.PHP.statementToCode(block, 'ELSE');
    if (Blockly.PHP.STATEMENT_SUFFIX) {
      branchCode = Blockly.PHP.prefixLines(
          Blockly.PHP.injectId(Blockly.PHP.STATEMENT_SUFFIX, block),
          Blockly.PHP.INDENT) + branchCode;
    }
    code += ' else {\n' + branchCode + '}';
  }
  return code + '\n';
};

Blockly.PHP['controls_ifelse'] = Blockly.PHP['controls_if'];

Blockly.PHP['logic_compare'] = function(block) {
  // Comparison operator.
  var OPERATORS = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  var operator = OPERATORS[block.getFieldValue('OP')];
  var order = (operator == '==' || operator == '!=') ?
      Blockly.PHP.ORDER_EQUALITY : Blockly.PHP.ORDER_RELATIONAL;
  var argument0 = Blockly.PHP.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'B', order) || '0';
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.PHP['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? '&&' : '||';
  var order = (operator == '&&') ? Blockly.PHP.ORDER_LOGICAL_AND :
      Blockly.PHP.ORDER_LOGICAL_OR;
  var argument0 = Blockly.PHP.valueToCode(block, 'A', order);
  var argument1 = Blockly.PHP.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == '&&') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};

Blockly.PHP['logic_negate'] = function(block) {
  // Negation.
  var order = Blockly.PHP.ORDER_LOGICAL_NOT;
  var argument0 = Blockly.PHP.valueToCode(block, 'BOOL', order) ||
      'true';
  var code = '!' + argument0;
  return [code, order];
};

Blockly.PHP['logic_boolean'] = function(block) {
  // Boolean values true and false.
  var code = (block.getFieldValue('BOOL') == 'TRUE') ? 'true' : 'false';
  return [code, Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['logic_null'] = function(block) {
  // Null data type.
  return ['null', Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['logic_ternary'] = function(block) {
  // Ternary operator.
  var value_if = Blockly.PHP.valueToCode(block, 'IF',
      Blockly.PHP.ORDER_CONDITIONAL) || 'false';
  var value_then = Blockly.PHP.valueToCode(block, 'THEN',
      Blockly.PHP.ORDER_CONDITIONAL) || 'null';
  var value_else = Blockly.PHP.valueToCode(block, 'ELSE',
      Blockly.PHP.ORDER_CONDITIONAL) || 'null';
  var code = value_if + ' ? ' + value_then + ' : ' + value_else;
  return [code, Blockly.PHP.ORDER_CONDITIONAL];
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for loop blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.loops');

goog.require('Blockly.PHP');


Blockly.PHP['controls_repeat_ext'] = function(block) {
  // Repeat n times.
  if (block.getField('TIMES')) {
    // Internal number.
    var repeats = String(Number(block.getFieldValue('TIMES')));
  } else {
    // External number.
    var repeats = Blockly.PHP.valueToCode(block, 'TIMES',
        Blockly.PHP.ORDER_ASSIGNMENT) || '0';
  }
  var branch = Blockly.PHP.statementToCode(block, 'DO');
  branch = Blockly.PHP.addLoopTrap(branch, block);
  var code = '';
  var loopVar = Blockly.PHP.variableDB_.getDistinctName(
      'count', Blockly.VARIABLE_CATEGORY_NAME);
  var endVar = repeats;
  if (!repeats.match(/^\w+$/) && !Blockly.isNumber(repeats)) {
    endVar = Blockly.PHP.variableDB_.getDistinctName(
        'repeat_end', Blockly.VARIABLE_CATEGORY_NAME);
    code += endVar + ' = ' + repeats + ';\n';
  }
  code += 'for (' + loopVar + ' = 0; ' +
      loopVar + ' < ' + endVar + '; ' +
      loopVar + '++) {\n' +
      branch + '}\n';
  return code;
};

Blockly.PHP['controls_repeat'] = Blockly.PHP['controls_repeat_ext'];

Blockly.PHP['controls_whileUntil'] = function(block) {
  // Do while/until loop.
  var until = block.getFieldValue('MODE') == 'UNTIL';
  var argument0 = Blockly.PHP.valueToCode(block, 'BOOL',
      until ? Blockly.PHP.ORDER_LOGICAL_NOT :
      Blockly.PHP.ORDER_NONE) || 'false';
  var branch = Blockly.PHP.statementToCode(block, 'DO');
  branch = Blockly.PHP.addLoopTrap(branch, block);
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while (' + argument0 + ') {\n' + branch + '}\n';
};

Blockly.PHP['controls_for'] = function(block) {
  // For loop.
  var variable0 = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var argument0 = Blockly.PHP.valueToCode(block, 'FROM',
      Blockly.PHP.ORDER_ASSIGNMENT) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'TO',
      Blockly.PHP.ORDER_ASSIGNMENT) || '0';
  var increment = Blockly.PHP.valueToCode(block, 'BY',
      Blockly.PHP.ORDER_ASSIGNMENT) || '1';
  var branch = Blockly.PHP.statementToCode(block, 'DO');
  branch = Blockly.PHP.addLoopTrap(branch, block);
  var code;
  if (Blockly.isNumber(argument0) && Blockly.isNumber(argument1) &&
      Blockly.isNumber(increment)) {
    // All arguments are simple numbers.
    var up = Number(argument0) <= Number(argument1);
    code = 'for (' + variable0 + ' = ' + argument0 + '; ' +
        variable0 + (up ? ' <= ' : ' >= ') + argument1 + '; ' +
        variable0;
    var step = Math.abs(Number(increment));
    if (step == 1) {
      code += up ? '++' : '--';
    } else {
      code += (up ? ' += ' : ' -= ') + step;
    }
    code += ') {\n' + branch + '}\n';
  } else {
    code = '';
    // Cache non-trivial values to variables to prevent repeated look-ups.
    var startVar = argument0;
    if (!argument0.match(/^\w+$/) && !Blockly.isNumber(argument0)) {
      startVar = Blockly.PHP.variableDB_.getDistinctName(
          variable0 + '_start', Blockly.VARIABLE_CATEGORY_NAME);
      code += startVar + ' = ' + argument0 + ';\n';
    }
    var endVar = argument1;
    if (!argument1.match(/^\w+$/) && !Blockly.isNumber(argument1)) {
      endVar = Blockly.PHP.variableDB_.getDistinctName(
          variable0 + '_end', Blockly.VARIABLE_CATEGORY_NAME);
      code += endVar + ' = ' + argument1 + ';\n';
    }
    // Determine loop direction at start, in case one of the bounds
    // changes during loop execution.
    var incVar = Blockly.PHP.variableDB_.getDistinctName(
        variable0 + '_inc', Blockly.VARIABLE_CATEGORY_NAME);
    code += incVar + ' = ';
    if (Blockly.isNumber(increment)) {
      code += Math.abs(increment) + ';\n';
    } else {
      code += 'abs(' + increment + ');\n';
    }
    code += 'if (' + startVar + ' > ' + endVar + ') {\n';
    code += Blockly.PHP.INDENT + incVar + ' = -' + incVar + ';\n';
    code += '}\n';
    code += 'for (' + variable0 + ' = ' + startVar + '; ' +
        incVar + ' >= 0 ? ' +
        variable0 + ' <= ' + endVar + ' : ' +
        variable0 + ' >= ' + endVar + '; ' +
        variable0 + ' += ' + incVar + ') {\n' +
        branch + '}\n';
  }
  return code;
};

Blockly.PHP['controls_forEach'] = function(block) {
  // For each loop.
  var variable0 = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var argument0 = Blockly.PHP.valueToCode(block, 'LIST',
      Blockly.PHP.ORDER_ASSIGNMENT) || '[]';
  var branch = Blockly.PHP.statementToCode(block, 'DO');
  branch = Blockly.PHP.addLoopTrap(branch, block);
  var code = '';
  code += 'foreach (' + argument0 + ' as ' + variable0 +
      ') {\n' + branch + '}\n';
  return code;
};

Blockly.PHP['controls_flow_statements'] = function(block) {
  // Flow statements: continue, break.
  var xfix = '';
  if (Blockly.PHP.STATEMENT_PREFIX) {
    // Automatic prefix insertion is switched off for this block.  Add manually.
    xfix += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_PREFIX, block);
  }
  if (Blockly.PHP.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the break/continue is triggered.
    xfix += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_SUFFIX, block);
  }
  if (Blockly.PHP.STATEMENT_PREFIX) {
    var loop = Blockly.Constants.Loops
        .CONTROL_FLOW_IN_LOOP_CHECK_MIXIN.getSurroundLoop(block);
    if (loop && !loop.suppressPrefixSuffix) {
      // Inject loop's statement prefix here since the regular one at the end
      // of the loop will not get executed if 'continue' is triggered.
      // In the case of 'break', a prefix is needed due to the loop's suffix.
      xfix += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_PREFIX, loop);
    }
  }
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return xfix + 'break;\n';
    case 'CONTINUE':
      return xfix + 'continue;\n';
  }
  throw Error('Unknown flow statement.');
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for math blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.math');

goog.require('Blockly.PHP');


Blockly.PHP['math_number'] = function(block) {
  // Numeric value.
  var code = Number(block.getFieldValue('NUM'));
  var order = code >= 0 ? Blockly.PHP.ORDER_ATOMIC :
              Blockly.PHP.ORDER_UNARY_NEGATION;
  if (code == Infinity) {
    code = 'INF';
  } else if (code == -Infinity) {
    code = '-INF';
  }
  return [code, order];
};

Blockly.PHP['math_arithmetic'] = function(block) {
  // Basic arithmetic operators, and power.
  var OPERATORS = {
    'ADD': [' + ', Blockly.PHP.ORDER_ADDITION],
    'MINUS': [' - ', Blockly.PHP.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', Blockly.PHP.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', Blockly.PHP.ORDER_DIVISION],
    'POWER': [' ** ', Blockly.PHP.ORDER_POWER]
  };
  var tuple = OPERATORS[block.getFieldValue('OP')];
  var operator = tuple[0];
  var order = tuple[1];
  var argument0 = Blockly.PHP.valueToCode(block, 'A', order) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'B', order) || '0';
  var code = argument0 + operator + argument1;
  return [code, order];
};

Blockly.PHP['math_single'] = function(block) {
  // Math operators with single operand.
  var operator = block.getFieldValue('OP');
  var code;
  var arg;
  if (operator == 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = Blockly.PHP.valueToCode(block, 'NUM',
        Blockly.PHP.ORDER_UNARY_NEGATION) || '0';
    if (arg[0] == '-') {
      // --3 is not legal in JS.
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, Blockly.PHP.ORDER_UNARY_NEGATION];
  }
  if (operator == 'SIN' || operator == 'COS' || operator == 'TAN') {
    arg = Blockly.PHP.valueToCode(block, 'NUM',
        Blockly.PHP.ORDER_DIVISION) || '0';
  } else {
    arg = Blockly.PHP.valueToCode(block, 'NUM',
        Blockly.PHP.ORDER_NONE) || '0';
  }
  // First, handle cases which generate values that don't need parentheses
  // wrapping the code.
  switch (operator) {
    case 'ABS':
      code = 'abs(' + arg + ')';
      break;
    case 'ROOT':
      code = 'sqrt(' + arg + ')';
      break;
    case 'LN':
      code = 'log(' + arg + ')';
      break;
    case 'EXP':
      code = 'exp(' + arg + ')';
      break;
    case 'POW10':
      code = 'pow(10,' + arg + ')';
      break;
    case 'ROUND':
      code = 'round(' + arg + ')';
      break;
    case 'ROUNDUP':
      code = 'ceil(' + arg + ')';
      break;
    case 'ROUNDDOWN':
      code = 'floor(' + arg + ')';
      break;
    case 'SIN':
      code = 'sin(' + arg + ' / 180 * pi())';
      break;
    case 'COS':
      code = 'cos(' + arg + ' / 180 * pi())';
      break;
    case 'TAN':
      code = 'tan(' + arg + ' / 180 * pi())';
      break;
  }
  if (code) {
    return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
  }
  // Second, handle cases which generate values that may need parentheses
  // wrapping the code.
  switch (operator) {
    case 'LOG10':
      code = 'log(' + arg + ') / log(10)';
      break;
    case 'ASIN':
      code = 'asin(' + arg + ') / pi() * 180';
      break;
    case 'ACOS':
      code = 'acos(' + arg + ') / pi() * 180';
      break;
    case 'ATAN':
      code = 'atan(' + arg + ') / pi() * 180';
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, Blockly.PHP.ORDER_DIVISION];
};

Blockly.PHP['math_constant'] = function(block) {
  // Constants: PI, E, the Golden Ratio, sqrt(2), 1/sqrt(2), INFINITY.
  var CONSTANTS = {
    'PI': ['M_PI', Blockly.PHP.ORDER_ATOMIC],
    'E': ['M_E', Blockly.PHP.ORDER_ATOMIC],
    'GOLDEN_RATIO': ['(1 + sqrt(5)) / 2', Blockly.PHP.ORDER_DIVISION],
    'SQRT2': ['M_SQRT2', Blockly.PHP.ORDER_ATOMIC],
    'SQRT1_2': ['M_SQRT1_2', Blockly.PHP.ORDER_ATOMIC],
    'INFINITY': ['INF', Blockly.PHP.ORDER_ATOMIC]
  };
  return CONSTANTS[block.getFieldValue('CONSTANT')];
};

Blockly.PHP['math_number_property'] = function(block) {
  // Check if a number is even, odd, prime, whole, positive, or negative
  // or if it is divisible by certain number. Returns true or false.
  var number_to_check = Blockly.PHP.valueToCode(block, 'NUMBER_TO_CHECK',
      Blockly.PHP.ORDER_MODULUS) || '0';
  var dropdown_property = block.getFieldValue('PROPERTY');
  var code;
  if (dropdown_property == 'PRIME') {
    // Prime is a special case as it is not a one-liner test.
    var functionName = Blockly.PHP.provideFunction_(
        'math_isPrime',
        ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ + '($n) {',
         '  // https://en.wikipedia.org/wiki/Primality_test#Naive_methods',
         '  if ($n == 2 || $n == 3) {',
         '    return true;',
         '  }',
         '  // False if n is NaN, negative, is 1, or not whole.',
         '  // And false if n is divisible by 2 or 3.',
         '  if (!is_numeric($n) || $n <= 1 || $n % 1 != 0 || $n % 2 == 0 ||' +
            ' $n % 3 == 0) {',
         '    return false;',
         '  }',
         '  // Check all the numbers of form 6k +/- 1, up to sqrt(n).',
         '  for ($x = 6; $x <= sqrt($n) + 1; $x += 6) {',
         '    if ($n % ($x - 1) == 0 || $n % ($x + 1) == 0) {',
         '      return false;',
         '    }',
         '  }',
         '  return true;',
         '}']);
    code = functionName + '(' + number_to_check + ')';
    return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
  }
  switch (dropdown_property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 == 1';
      break;
    case 'WHOLE':
      code = 'is_int(' + number_to_check + ')';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      var divisor = Blockly.PHP.valueToCode(block, 'DIVISOR',
          Blockly.PHP.ORDER_MODULUS) || '0';
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
  }
  return [code, Blockly.PHP.ORDER_EQUALITY];
};

Blockly.PHP['math_change'] = function(block) {
  // Add to a variable in place.
  var argument0 = Blockly.PHP.valueToCode(block, 'DELTA',
      Blockly.PHP.ORDER_ADDITION) || '0';
  var varName = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  return varName + ' += ' + argument0 + ';\n';
};

// Rounding functions have a single operand.
Blockly.PHP['math_round'] = Blockly.PHP['math_single'];
// Trigonometry functions have a single operand.
Blockly.PHP['math_trig'] = Blockly.PHP['math_single'];

Blockly.PHP['math_on_list'] = function(block) {
  // Math functions for lists.
  var func = block.getFieldValue('OP');
  var list, code;
  switch (func) {
    case 'SUM':
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_FUNCTION_CALL) || 'array()';
      code = 'array_sum(' + list + ')';
      break;
    case 'MIN':
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_FUNCTION_CALL) || 'array()';
      code = 'min(' + list + ')';
      break;
    case 'MAX':
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_FUNCTION_CALL) || 'array()';
      code = 'max(' + list + ')';
      break;
    case 'AVERAGE':
      var functionName = Blockly.PHP.provideFunction_(
          'math_mean',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
              '($myList) {',
           '  return array_sum($myList) / count($myList);',
           '}']);
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_NONE) || 'array()';
      code = functionName + '(' + list + ')';
      break;
    case 'MEDIAN':
      var functionName = Blockly.PHP.provideFunction_(
          'math_median',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
              '($arr) {',
           '  sort($arr,SORT_NUMERIC);',
           '  return (count($arr) % 2) ? $arr[floor(count($arr)/2)] : ',
           '      ($arr[floor(count($arr)/2)] + $arr[floor(count($arr)/2)' +
              ' - 1]) / 2;',
           '}']);
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'MODE':
      // As a list of numbers can contain more than one mode,
      // the returned result is provided as an array.
      // Mode of [3, 'x', 'x', 1, 1, 2, '3'] -> ['x', 1].
      var functionName = Blockly.PHP.provideFunction_(
          'math_modes',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
              '($values) {',
           '  if (empty($values)) return array();',
           '  $counts = array_count_values($values);',
           '  arsort($counts); // Sort counts in descending order',
           '  $modes = array_keys($counts, current($counts), true);',
           '  return $modes;',
           '}']);
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'STD_DEV':
      var functionName = Blockly.PHP.provideFunction_(
          'math_standard_deviation',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
              '($numbers) {',
           '  $n = count($numbers);',
           '  if (!$n) return null;',
           '  $mean = array_sum($numbers) / count($numbers);',
           '  foreach($numbers as $key => $num) $devs[$key] = ' +
              'pow($num - $mean, 2);',
           '  return sqrt(array_sum($devs) / (count($devs) - 1));',
           '}']);
      list = Blockly.PHP.valueToCode(block, 'LIST',
              Blockly.PHP.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    case 'RANDOM':
      var functionName = Blockly.PHP.provideFunction_(
          'math_random_list',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
              '($list) {',
           '  $x = rand(0, count($list)-1);',
           '  return $list[$x];',
           '}']);
      list = Blockly.PHP.valueToCode(block, 'LIST',
          Blockly.PHP.ORDER_NONE) || '[]';
      code = functionName + '(' + list + ')';
      break;
    default:
      throw Error('Unknown operator: ' + func);
  }
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['math_modulo'] = function(block) {
  // Remainder computation.
  var argument0 = Blockly.PHP.valueToCode(block, 'DIVIDEND',
      Blockly.PHP.ORDER_MODULUS) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'DIVISOR',
      Blockly.PHP.ORDER_MODULUS) || '0';
  var code = argument0 + ' % ' + argument1;
  return [code, Blockly.PHP.ORDER_MODULUS];
};

Blockly.PHP['math_constrain'] = function(block) {
  // Constrain a number between two limits.
  var argument0 = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_COMMA) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'LOW',
      Blockly.PHP.ORDER_COMMA) || '0';
  var argument2 = Blockly.PHP.valueToCode(block, 'HIGH',
      Blockly.PHP.ORDER_COMMA) || 'Infinity';
  var code = 'min(max(' + argument0 + ', ' + argument1 + '), ' +
      argument2 + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['math_random_int'] = function(block) {
  // Random integer between [X] and [Y].
  var argument0 = Blockly.PHP.valueToCode(block, 'FROM',
      Blockly.PHP.ORDER_COMMA) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'TO',
      Blockly.PHP.ORDER_COMMA) || '0';
  var functionName = Blockly.PHP.provideFunction_(
      'math_random_int',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($a, $b) {',
       '  if ($a > $b) {',
       '    return rand($b, $a);',
       '  }',
       '  return rand($a, $b);',
       '}']);
  var code = functionName + '(' + argument0 + ', ' + argument1 + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['math_random_float'] = function(block) {
  // Random fraction between 0 and 1.
  return ['(float)rand()/(float)getrandmax()', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['math_atan2'] = function(block) {
  // Arctangent of point (X, Y) in degrees from -180 to 180.
  var argument0 = Blockly.PHP.valueToCode(block, 'X',
      Blockly.PHP.ORDER_COMMA) || '0';
  var argument1 = Blockly.PHP.valueToCode(block, 'Y',
      Blockly.PHP.ORDER_COMMA) || '0';
  return ['atan2(' + argument1 + ', ' + argument0 + ') / pi() * 180',
      Blockly.PHP.ORDER_DIVISION];
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for procedure blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.procedures');

goog.require('Blockly.PHP');

Blockly.PHP['procedures_defreturn'] = function(block) {
  // Define a procedure with a return value.
  // First, add a 'global' statement for every variable that is not shadowed by
  // a local parameter.
  var globals = [];
  var varName;
  var workspace = block.workspace;
  var variables = Blockly.Variables.allUsedVarModels(workspace) || [];
  for (var i = 0, variable; variable = variables[i]; i++) {
    varName = variable.name;
    if (block.arguments_.indexOf(varName) == -1) {
      globals.push(Blockly.PHP.variableDB_.getName(varName,
          Blockly.VARIABLE_CATEGORY_NAME));
    }
  }
  // Add developer variables.
  var devVarList = Blockly.Variables.allDeveloperVariables(workspace);
  for (var i = 0; i < devVarList.length; i++) {
    globals.push(Blockly.PHP.variableDB_.getName(devVarList[i],
        Blockly.Names.DEVELOPER_VARIABLE_TYPE));
  }
  globals = globals.length ?
      Blockly.PHP.INDENT + 'global ' + globals.join(', ') + ';\n' : '';

  var funcName = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var xfix1 = '';
  if (Blockly.PHP.STATEMENT_PREFIX) {
    xfix1 += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_PREFIX, block);
  }
  if (Blockly.PHP.STATEMENT_SUFFIX) {
    xfix1 += Blockly.PHP.injectId(Blockly.PHP.STATEMENT_SUFFIX, block);
  }
  if (xfix1) {
    xfix1 = Blockly.PHP.prefixLines(xfix1, Blockly.PHP.INDENT);
  }
  var loopTrap = '';
  if (Blockly.PHP.INFINITE_LOOP_TRAP) {
    loopTrap = Blockly.PHP.prefixLines(
        Blockly.PHP.injectId(Blockly.PHP.INFINITE_LOOP_TRAP, block),
        Blockly.PHP.INDENT);
  }
  var branch = Blockly.PHP.statementToCode(block, 'STACK');
  var returnValue = Blockly.PHP.valueToCode(block, 'RETURN',
      Blockly.PHP.ORDER_NONE) || '';
  var xfix2 = '';
  if (branch && returnValue) {
    // After executing the function body, revisit this block for the return.
    xfix2 = xfix1;
  }
  if (returnValue) {
    returnValue = Blockly.PHP.INDENT + 'return ' + returnValue + ';\n';
  }
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Blockly.PHP.variableDB_.getName(block.arguments_[i],
        Blockly.VARIABLE_CATEGORY_NAME);
  }
  var code = 'function ' + funcName + '(' + args.join(', ') + ') {\n' +
      globals + xfix1 + loopTrap + branch + xfix2 + returnValue + '}';
  code = Blockly.PHP.scrub_(block, code);
  // Add % so as not to collide with helper functions in definitions list.
  Blockly.PHP.definitions_['%' + funcName] = code;
  return null;
};

// Defining a procedure without a return value uses the same generator as
// a procedure with a return value.
Blockly.PHP['procedures_defnoreturn'] =
    Blockly.PHP['procedures_defreturn'];

Blockly.PHP['procedures_callreturn'] = function(block) {
  // Call a procedure with a return value.
  var funcName = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('NAME'), Blockly.PROCEDURE_CATEGORY_NAME);
  var args = [];
  for (var i = 0; i < block.arguments_.length; i++) {
    args[i] = Blockly.PHP.valueToCode(block, 'ARG' + i,
        Blockly.PHP.ORDER_COMMA) || 'null';
  }
  var code = funcName + '(' + args.join(', ') + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['procedures_callnoreturn'] = function(block) {
  // Call a procedure with no return value.
  // Generated code is for a function call as a statement is the same as a
  // function call as a value, with the addition of line ending.
  var tuple = Blockly.PHP['procedures_callreturn'](block);
  return tuple[0] + ';\n';
};

Blockly.PHP['procedures_ifreturn'] = function(block) {
  // Conditionally return value from a procedure.
  var condition = Blockly.PHP.valueToCode(block, 'CONDITION',
      Blockly.PHP.ORDER_NONE) || 'false';
  var code = 'if (' + condition + ') {\n';
  if (Blockly.PHP.STATEMENT_SUFFIX) {
    // Inject any statement suffix here since the regular one at the end
    // will not get executed if the return is triggered.
    code += Blockly.PHP.prefixLines(
        Blockly.PHP.injectId(Blockly.PHP.STATEMENT_SUFFIX, block),
        Blockly.PHP.INDENT);
  }
  if (block.hasReturnValue_) {
    var value = Blockly.PHP.valueToCode(block, 'VALUE',
        Blockly.PHP.ORDER_NONE) || 'null';
    code += Blockly.PHP.INDENT + 'return ' + value + ';\n';
  } else {
    code += Blockly.PHP.INDENT + 'return;\n';
  }
  code += '}\n';
  return code;
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for text blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.texts');

goog.require('Blockly.PHP');


Blockly.PHP['text'] = function(block) {
  // Text value.
  var code = Blockly.PHP.quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['text_multiline'] = function(block) {
  // Text value.
  var code = Blockly.PHP.multiline_quote_(block.getFieldValue('TEXT'));
  return [code, Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['text_join'] = function(block) {
  // Create a string made up of any number of elements of any type.
  if (block.itemCount_ == 0) {
    return ['\'\'', Blockly.PHP.ORDER_ATOMIC];
  } else if (block.itemCount_ == 1) {
    var element = Blockly.PHP.valueToCode(block, 'ADD0',
        Blockly.PHP.ORDER_NONE) || '\'\'';
    var code = element;
    return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
  } else if (block.itemCount_ == 2) {
    var element0 = Blockly.PHP.valueToCode(block, 'ADD0',
        Blockly.PHP.ORDER_ATOMIC) || '\'\'';
    var element1 = Blockly.PHP.valueToCode(block, 'ADD1',
        Blockly.PHP.ORDER_ATOMIC) || '\'\'';
    var code = element0 + ' . ' + element1;
    return [code, Blockly.PHP.ORDER_STRING_CONCAT];
  } else {
    var elements = new Array(block.itemCount_);
    for (var i = 0; i < block.itemCount_; i++) {
      elements[i] = Blockly.PHP.valueToCode(block, 'ADD' + i,
          Blockly.PHP.ORDER_COMMA) || '\'\'';
    }
    var code = 'implode(\'\', array(' + elements.join(',') + '))';
    return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
  }
};

Blockly.PHP['text_append'] = function(block) {
  // Append to a variable in place.
  var varName = Blockly.PHP.variableDB_.getName(
      block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
  var value = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_ASSIGNMENT) || '\'\'';
  return varName + ' .= ' + value + ';\n';
};

Blockly.PHP['text_length'] = function(block) {
  // String or array length.
  var functionName = Blockly.PHP.provideFunction_(
      'length',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ + '($value) {',
       '  if (is_string($value)) {',
       '    return strlen($value);',
       '  } else {',
       '    return count($value);',
       '  }',
       '}']);
  var text = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  return [functionName + '(' + text + ')', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_isEmpty'] = function(block) {
  // Is the string null or array empty?
  var text = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  return ['empty(' + text + ')', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_indexOf'] = function(block) {
  // Search the text for a substring.
  var operator = block.getFieldValue('END') == 'FIRST' ?
      'strpos' : 'strrpos';
  var substring = Blockly.PHP.valueToCode(block, 'FIND',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  var text = Blockly.PHP.valueToCode(block, 'VALUE',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  if (block.workspace.options.oneBasedIndex) {
    var errorIndex = ' 0';
    var indexAdjustment = ' + 1';
  } else {
    var errorIndex = ' -1';
    var indexAdjustment = '';
  }
  var functionName = Blockly.PHP.provideFunction_(
      block.getFieldValue('END') == 'FIRST' ?
          'text_indexOf' : 'text_lastIndexOf',
      ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
          '($text, $search) {',
       '  $pos = ' + operator + '($text, $search);',
       '  return $pos === false ? ' + errorIndex + ' : $pos' +
          indexAdjustment + ';',
       '}']);
  var code = functionName + '(' + text + ', ' + substring + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_charAt'] = function(block) {
  // Get letter at index.
  var where = block.getFieldValue('WHERE') || 'FROM_START';
  var textOrder = (where == 'RANDOM') ? Blockly.PHP.ORDER_NONE :
      Blockly.PHP.ORDER_COMMA;
  var text = Blockly.PHP.valueToCode(block, 'VALUE', textOrder) || '\'\'';
  switch (where) {
    case 'FIRST':
      var code = 'substr(' + text + ', 0, 1)';
      return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
    case 'LAST':
      var code = 'substr(' + text + ', -1)';
      return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
    case 'FROM_START':
      var at = Blockly.PHP.getAdjusted(block, 'AT');
      var code = 'substr(' + text + ', ' + at + ', 1)';
      return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
    case 'FROM_END':
      var at = Blockly.PHP.getAdjusted(block, 'AT', 1, true);
      var code = 'substr(' + text + ', ' + at + ', 1)';
      return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
    case 'RANDOM':
      var functionName = Blockly.PHP.provideFunction_(
          'text_random_letter',
          ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ + '($text) {',
           '  return $text[rand(0, strlen($text) - 1)];',
           '}']);
      code = functionName + '(' + text + ')';
      return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
  }
  throw Error('Unhandled option (text_charAt).');
};

Blockly.PHP['text_getSubstring'] = function(block) {
  // Get substring.
  var text = Blockly.PHP.valueToCode(block, 'STRING',
      Blockly.PHP.ORDER_FUNCTION_CALL) || '\'\'';
  var where1 = block.getFieldValue('WHERE1');
  var where2 = block.getFieldValue('WHERE2');
  if (where1 == 'FIRST' && where2 == 'LAST') {
    var code = text;
  } else {
    var at1 = Blockly.PHP.getAdjusted(block, 'AT1');
    var at2 = Blockly.PHP.getAdjusted(block, 'AT2');
    var functionName = Blockly.PHP.provideFunction_(
        'text_get_substring',
        ['function ' + Blockly.PHP.FUNCTION_NAME_PLACEHOLDER_ +
            '($text, $where1, $at1, $where2, $at2) {',
         '  if ($where1 == \'FROM_END\') {',
         '    $at1 = strlen($text) - 1 - $at1;',
         '  } else if ($where1 == \'FIRST\') {',
         '    $at1 = 0;',
         '  } else if ($where1 != \'FROM_START\') {',
         '    throw new Exception(\'Unhandled option (text_get_substring).\');',
         '  }',
         '  $length = 0;',
         '  if ($where2 == \'FROM_START\') {',
         '    $length = $at2 - $at1 + 1;',
         '  } else if ($where2 == \'FROM_END\') {',
         '    $length = strlen($text) - $at1 - $at2;',
         '  } else if ($where2 == \'LAST\') {',
         '    $length = strlen($text) - $at1;',
         '  } else {',
         '    throw new Exception(\'Unhandled option (text_get_substring).\');',
         '  }',
         '  return substr($text, $at1, $length);',
         '}']);
    var code = functionName + '(' + text + ', \'' +
        where1 + '\', ' + at1 + ', \'' + where2 + '\', ' + at2 + ')';
  }
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_changeCase'] = function(block) {
  // Change capitalization.
  var text = Blockly.PHP.valueToCode(block, 'TEXT',
          Blockly.PHP.ORDER_NONE) || '\'\'';
  if (block.getFieldValue('CASE') == 'UPPERCASE') {
    var code = 'strtoupper(' + text + ')';
  } else if (block.getFieldValue('CASE') == 'LOWERCASE') {
    var code = 'strtolower(' + text + ')';
  } else if (block.getFieldValue('CASE') == 'TITLECASE') {
    var code = 'ucwords(strtolower(' + text + '))';
  }
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_trim'] = function(block) {
  // Trim spaces.
  var OPERATORS = {
    'LEFT': 'ltrim',
    'RIGHT': 'rtrim',
    'BOTH': 'trim'
  };
  var operator = OPERATORS[block.getFieldValue('MODE')];
  var text = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  return [operator + '(' + text + ')', Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_print'] = function(block) {
  // Print statement.
  var msg = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  return 'print(' + msg + ');\n';
};

Blockly.PHP['text_prompt_ext'] = function(block) {
  // Prompt function.
  if (block.getField('TEXT')) {
    // Internal message.
    var msg = Blockly.PHP.quote_(block.getFieldValue('TEXT'));
  } else {
    // External message.
    var msg = Blockly.PHP.valueToCode(block, 'TEXT',
        Blockly.PHP.ORDER_NONE) || '\'\'';
  }
  var code = 'readline(' + msg + ')';
  var toNumber = block.getFieldValue('TYPE') == 'NUMBER';
  if (toNumber) {
    code = 'floatval(' + code + ')';
  }
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_prompt'] = Blockly.PHP['text_prompt_ext'];

Blockly.PHP['text_count'] = function(block) {
  var text = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_MEMBER) || '\'\'';
  var sub = Blockly.PHP.valueToCode(block, 'SUB',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  var code = 'strlen(' + sub + ') === 0'
    + ' ? strlen(' + text + ') + 1'
    + ' : substr_count(' + text + ', ' + sub + ')';
  return [code, Blockly.PHP.ORDER_CONDITIONAL];
};

Blockly.PHP['text_replace'] = function(block) {
  var text = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_MEMBER) || '\'\'';
  var from = Blockly.PHP.valueToCode(block, 'FROM',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  var to = Blockly.PHP.valueToCode(block, 'TO',
      Blockly.PHP.ORDER_NONE) || '\'\'';
  var code = 'str_replace(' + from + ', ' + to + ', ' + text + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};

Blockly.PHP['text_reverse'] = function(block) {
  var text = Blockly.PHP.valueToCode(block, 'TEXT',
      Blockly.PHP.ORDER_MEMBER) || '\'\'';
  var code = 'strrev(' + text + ')';
  return [code, Blockly.PHP.ORDER_FUNCTION_CALL];
};
/**
 * @license
 * Copyright 2015 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for variable blocks.
 * @author daarond@gmail.com (Daaron Dwyer)
 */
'use strict';

goog.provide('Blockly.PHP.variables');

goog.require('Blockly.PHP');


Blockly.PHP['variables_get'] = function(block) {
    // Variable getter.
    var code = Blockly.PHP.variableDB_.getName(block.getFieldValue('VAR'),
        Blockly.VARIABLE_CATEGORY_NAME);
    return [code, Blockly.PHP.ORDER_ATOMIC];
};

Blockly.PHP['variables_set'] = function(block) {
    // Variable setter.
    var argument0 = Blockly.PHP.valueToCode(block, 'VALUE',
            Blockly.PHP.ORDER_ASSIGNMENT) || '0';
    var varName = Blockly.PHP.variableDB_.getName(
        block.getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME);
    return varName + ' = ' + argument0 + ';\n';
};
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Generating PHP for dynamic variable blocks.
 * @author fenichel@google.com (Rachel Fenichel)
 */
'use strict';

goog.provide('Blockly.PHP.variablesDynamic');

goog.require('Blockly.PHP');
goog.require('Blockly.PHP.variables');


// PHP is dynamically typed.
Blockly.PHP['variables_get_dynamic'] = Blockly.PHP['variables_get'];
Blockly.PHP['variables_set_dynamic'] = Blockly.PHP['variables_set'];
